// TODO: enforce explicit return types
import {
  ASTNode,
  Kind,
  Location as NonNullLocation,
  OperationTypeNode,
  Token,
  TokenKind,
  visit,
} from "graphql";

type Maybe<T> = T | null | undefined;

type Location = NonNullLocation | undefined;

type Indentation = "+" | "-";

type Text = { type: "text"; value: string };

type SoftLine = {
  type: "soft_line";
  alt: Text[];
  prefix: Text[];
  indentation?: Indentation;
};

type HardLine = { type: "hard_line"; indentation?: Indentation };

type Comment = { type: "block_comment" | "inline_comment"; token: Token };

type PrintToken = Text | SoftLine | HardLine | Comment;

type TransformedNode = { p: PrintToken[]; l: Location };

function text(value: string): Text {
  return { type: "text", value };
}

function softLine(
  alt: Text[],
  prefix: Text[] = [],
  indentation?: Indentation
): SoftLine {
  return { type: "soft_line", alt, prefix, indentation };
}

function hardLine(indentation?: Indentation): HardLine {
  return { type: "hard_line", indentation };
}

const BRACES = [TokenKind.BRACE_L, TokenKind.BRACE_R] as const;
const BRACKETS = [TokenKind.BRACKET_L, TokenKind.BRACKET_R] as const;
const PARENS = [TokenKind.PAREN_L, TokenKind.PAREN_R] as const;

type DelimitedListKinds =
  | Kind.OBJECT_TYPE_DEFINITION
  | Kind.OBJECT_TYPE_EXTENSION
  | Kind.INTERFACE_TYPE_DEFINITION
  | Kind.INTERFACE_TYPE_EXTENSION
  | Kind.UNION_TYPE_DEFINITION
  | Kind.UNION_TYPE_EXTENSION
  | Kind.DIRECTIVE_DEFINITION;

type PrintOptions = {
  indentationStep?: string;
  maxLineLength?: number;
  preserveComments?: boolean;
  minified?: boolean;
};

export function print(node: ASTNode | ASTNode[], options: PrintOptions = {}) {
  return (Array.isArray(node) ? node : [node])
    .map((node) => printAST(node, options))
    .join("\n");
}

function printAST(
  ast: ASTNode,
  {
    indentationStep = "  ",
    maxLineLength = 80,
    preserveComments = false,
    minified = false,
  }: PrintOptions
): string {
  const SPACE: Text = { type: "text", value: minified ? "" : " " };

  function getComments(token: Maybe<Token>) {
    if (!preserveComments || !token) return [];

    const comments: Comment[] = [];
    let running = token.prev;
    while (
      running?.kind === TokenKind.COMMENT &&
      running.line !== running.prev?.line
    ) {
      comments.unshift({ type: "block_comment", token: running });
      running = running.prev;
    }

    const line = token.kind === TokenKind.BLOCK_STRING ? 0 : token.line;
    if (token.next?.kind === TokenKind.COMMENT && token.next.line === line)
      comments.push({ type: "inline_comment", token: token.next });

    return comments;
  }

  function printWrappedListWithComments(
    list: readonly TransformedNode[],
    [open, close]: readonly [TokenKind, TokenKind],
    spacer: Text[],
    delimiter: Text[],
    forceMultiLine: boolean = false
  ) {
    const openingBracket = getComments(prev(list[0].l?.startToken, open));
    const closingBracket = getComments(
      next(list[list.length - 1].l?.endToken, close)
    );

    const shouldPrintMultiLine =
      !minified &&
      (forceMultiLine || hasHardLine(list) || closingBracket.length > 0);

    return [
      ...openingBracket,
      text(open),
      shouldPrintMultiLine ? hardLine("+") : softLine(spacer, undefined, "+"),
      ...join(list, [shouldPrintMultiLine ? hardLine() : softLine(delimiter)]),
      shouldPrintMultiLine
        ? hardLine("-")
        : softLine(
            closingBracket.length > 0 ? [text("\n")] : spacer,
            undefined,
            "-"
          ),
      ...closingBracket,
      text(close),
    ];
  }

  function printArgumentSet(args: Maybe<readonly TransformedNode[]>) {
    if (isEmpty(args)) return [];
    return printWrappedListWithComments(args, PARENS, [], [text(","), SPACE]);
  }

  function printInputValueDefinitionSet(
    inputValueDefinitions: Maybe<readonly TransformedNode[]>,
    parentKind: Kind
  ) {
    if (isEmpty(inputValueDefinitions)) return [];

    const [openAndClose, forceMultiline] =
      parentKind === Kind.DIRECTIVE_DEFINITION ||
      parentKind === Kind.FIELD_DEFINITION
        ? [PARENS, false]
        : [BRACES, true];

    return printWrappedListWithComments(
      inputValueDefinitions,
      openAndClose,
      [],
      [text(",")],
      forceMultiline
    );
  }

  function printOperationTypeDefinitionSet(
    operationTypes: Maybe<readonly TransformedNode[]>
  ) {
    if (isEmpty(operationTypes)) return [];
    return printWrappedListWithComments(
      operationTypes,
      BRACES,
      [],
      [text(",")],
      true
    );
  }

  function printEnumValueDefinitionSet(
    definitions: Maybe<readonly TransformedNode[]>
  ) {
    if (isEmpty(definitions)) return [];
    return printWrappedListWithComments(
      definitions,
      BRACES,
      [],
      [text(",")],
      true
    );
  }

  function printFieldDefinitionSet(fields: Maybe<readonly TransformedNode[]>) {
    if (isEmpty(fields)) return [];
    return printWrappedListWithComments(fields, BRACES, [], [text(",")], true);
  }

  function printDelimitedList(
    items: Maybe<readonly TransformedNode[]>,
    parentKind: DelimitedListKinds,
    initializerToken: Maybe<Token>
  ) {
    if (isEmpty(items)) return [];

    const [initializer, wrapInitializer, delimiterKind] =
      parentKind === Kind.UNION_TYPE_DEFINITION ||
      parentKind === Kind.UNION_TYPE_EXTENSION
        ? ["=", SPACE, TokenKind.PIPE]
        : parentKind === Kind.DIRECTIVE_DEFINITION
        ? ["on", text(" "), TokenKind.PIPE]
        : ["implements", text(" "), TokenKind.AMP];

    let hasComments = false;
    const itemsWithComments: { comments: PrintToken[]; type: PrintToken[] }[] =
      [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const nameToken = item.l?.endToken;
      const comments = getComments(nameToken);

      let delimiterToken = item.l?.endToken.prev;
      while (
        delimiterToken &&
        (i === 0
          ? delimiterToken.kind === TokenKind.COMMENT
          : delimiterToken.kind !== delimiterKind)
      )
        delimiterToken = delimiterToken.prev;
      if (i === 0 && delimiterToken?.kind !== delimiterKind)
        delimiterToken = null;
      const delimiterComments = getComments(delimiterToken);

      hasComments =
        hasComments || comments.length > 0 || delimiterComments.length > 0;

      itemsWithComments.push({
        comments: [...delimiterComments, ...comments],
        type: filterComments(item.p).rest,
      });
    }

    const itemList: PrintToken[] = getComments(initializerToken);
    if (itemList.length === 0) itemList.push(wrapInitializer);
    itemList.push(text(initializer), wrapInitializer);

    for (let i = 0; i < itemsWithComments.length; i++) {
      itemList.push(...itemsWithComments[i].comments);

      if (minified && i > 0) itemList.push(text(delimiterKind));

      if (!minified) {
        if (hasComments && itemsWithComments[i].comments.length === 0)
          itemList.push(hardLine());
        if (hasComments) itemList.push(text(delimiterKind + " "));
        else
          itemList.push(
            softLine(i === 0 ? [] : [text(" " + delimiterKind + " ")], [
              text(delimiterKind + " "),
            ])
          );
      }

      itemList.push(...itemsWithComments[i].type);
    }

    return itemList;
  }

  function withSpace(list: Maybe<PrintToken[]>) {
    return isEmpty(list) ? [] : [SPACE, ...list];
  }

  function printDescription(
    description: Maybe<TransformedNode>,
    comments: Comment[]
  ) {
    return description
      ? [
          ...description.p,
          ...(!minified && (!preserveComments || comments.length === 0)
            ? [hardLine()]
            : []),
        ]
      : [];
  }

  function printDefaultValue(node: Maybe<TransformedNode>) {
    if (!node) return [];

    const { comments, rest } = filterComments(node.p);
    const equalComments = getComments(prev(node.l?.endToken, TokenKind.EQUALS));

    return [
      ...equalComments,
      ...comments,
      ...(equalComments.length > 0 || comments.length > 0 ? [] : [SPACE]),
      text("="),
      SPACE,
      ...rest,
    ];
  }

  const list = visit<TransformedNode>(ast, {
    Argument: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(node.name.l?.endToken),
            ...getComments(next(node.name.l?.endToken.next, TokenKind.COLON)),
            ...node.name.p,
            text(":"),
            SPACE,
            ...node.value.p,
          ],
          l,
        };
      },
    },
    BooleanValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.endToken),
            text("" + (node.value as unknown as boolean)),
          ],
          l,
        };
      },
    },
    Directive: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(node.name.l?.endToken),
            text("@"),
            ...node.name.p,
            ...printArgumentSet(node.arguments),
          ],
          l,
        };
      },
    },
    DirectiveDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const keywordToken: Maybe<Token> = next(l?.startToken, TokenKind.NAME);
        const atToken = next(keywordToken?.next, TokenKind.AT);
        const onToken = next(atToken?.next, TokenKind.NAME, "on");

        let repeatableToken: Maybe<Token>;
        if (node.repeatable) {
          repeatableToken = onToken?.prev;
          while (repeatableToken && repeatableToken.kind === TokenKind.COMMENT)
            repeatableToken = repeatableToken.prev;
        }
        const repeatableComments = getComments(repeatableToken);

        const locations = printDelimitedList(
          node.locations,
          node.kind as unknown as DelimitedListKinds,
          onToken
        );

        const comments = [
          ...getComments(keywordToken),
          ...getComments(atToken),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("directive"),
            SPACE,
            text(TokenKind.AT),
            ...node.name.p,
            ...printInputValueDefinitionSet(
              node.arguments,
              node.kind as unknown as Kind
            ),
            ...repeatableComments,
            text(
              node.repeatable
                ? repeatableComments.length > 0
                  ? "repeatable"
                  : " repeatable"
                : ""
            ),
            ...locations,
          ],
          l,
        };
      },
    },
    Document: {
      leave(node) {
        const l = node.loc as Location;
        const comments = getComments(l?.endToken);
        return {
          p: [
            ...join(
              node.definitions.map((definition) => {
                while (definition.p[0].type === "hard_line")
                  definition.p.shift();
                return definition;
              }),
              [hardLine(), ...(minified ? [] : [hardLine()])]
            ),
            ...(minified || comments.length === 0
              ? []
              : [hardLine(), hardLine()]),
            ...comments,
          ],
          l,
        };
      },
    },
    EnumTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("enum "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printEnumValueDefinitionSet(node.values)),
          ],
          l,
        };
      },
    },
    EnumTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend enum "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printEnumValueDefinitionSet(node.values)),
          ],
          l,
        };
      },
    },
    EnumValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.endToken),
            text(node.value as unknown as string),
          ],
          l,
        };
      },
    },
    EnumValueDefinition: {
      leave(node) {
        const l = node.loc as Location;
        const comments = getComments(node.name.l?.endToken);
        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    Field: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(node.alias?.l?.endToken),
            ...getComments(
              node.alias ? next(l?.startToken?.next, TokenKind.COLON) : null
            ),
            ...getComments(node.name.l?.endToken),
            ...(node.alias ? [...node.alias.p, text(":"), SPACE] : []),
            ...node.name.p,
            ...printArgumentSet(node.arguments),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(node.selectionSet?.p || []),
          ],
          l,
        };
      },
    },
    FieldDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const colonToken = prev(node.type.l?.startToken.prev, TokenKind.COLON);
        const comments = [
          ...getComments(node.name.l?.endToken),
          ...getComments(colonToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            ...node.name.p,
            ...printInputValueDefinitionSet(
              node.arguments,
              node.kind as unknown as Kind
            ),
            text(":"),
            SPACE,
            ...node.type.p,
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    FloatValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.endToken),
            text(node.value as unknown as string),
          ],
          l,
        };
      },
    },
    FragmentDefinition: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(node.name.l?.endToken),
            ...getComments(
              prev(node.typeCondition.l?.endToken.prev, TokenKind.NAME)
            ),
            text("fragment "),
            ...node.name.p,
            text(" on "),
            ...node.typeCondition.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(node.selectionSet.p),
          ],
          l,
        };
      },
    },
    FragmentSpread: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(node.name.l?.endToken),
            text("..."),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    InlineFragment: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(
              node.typeCondition
                ? prev(node.typeCondition.l?.endToken.prev, TokenKind.NAME)
                : null
            ),
            text("..."),
            ...(node.typeCondition
              ? [text("on "), ...node.typeCondition.p]
              : []),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(node.selectionSet.p),
          ],
          l,
        };
      },
    },
    InputObjectTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];
        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("input "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(
              printInputValueDefinitionSet(
                node.fields,
                node.kind as unknown as Kind
              )
            ),
          ],
          l,
        };
      },
    },
    InputObjectTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken?.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend input "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(
              printInputValueDefinitionSet(
                node.fields,
                node.kind as unknown as Kind
              )
            ),
          ],
          l,
        };
      },
    },
    InputValueDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(node.name.l?.endToken),
          ...getComments(next(node.name.l?.endToken.next, TokenKind.COLON)),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            ...node.name.p,
            text(":"),
            SPACE,
            ...node.type.p,
            ...printDefaultValue(node.defaultValue),
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    InterfaceTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("interface "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.interfaces)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.NAME)
            ),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printFieldDefinitionSet(node.fields)),
          ],
          l,
        };
      },
    },
    InterfaceTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend interface "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.interfaces)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.NAME)
            ),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printFieldDefinitionSet(node.fields)),
          ],
          l,
        };
      },
    },
    IntValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.endToken),
            text(node.value as unknown as string),
          ],
          l,
        };
      },
    },
    ListType: {
      leave(node) {
        const l = node.loc as Location;
        const { comments, rest } = filterComments(node.type.p);
        return {
          p: [
            ...getComments(l?.startToken),
            ...comments,
            ...getComments(l?.endToken),
            text("["),
            ...rest,
            text("]"),
          ],
          l,
        };
      },
    },
    ListValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: isEmpty(node.values)
            ? [
                ...getComments(l?.startToken),
                text(TokenKind.BRACKET_L),
                ...getComments(l?.endToken),
                text(TokenKind.BRACKET_R),
              ]
            : printWrappedListWithComments(
                node.values,
                BRACKETS,
                [],
                [text(","), SPACE]
              ),
          l,
        };
      },
    },
    Name: {
      leave(node) {
        const l = node.loc as Location;
        return { p: [text(node.value as unknown as string)], l };
      },
    },
    NamedType: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [...getComments(l?.endToken), ...node.name.p],
          l,
        };
      },
    },
    NonNullType: {
      leave(node) {
        const l = node.loc as Location;
        const { comments, rest } = filterComments(node.type.p);
        return {
          p: [...comments, ...getComments(l?.endToken), ...rest, text("!")],
          l,
        };
      },
    },
    NullValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [...getComments(l?.endToken), text("null")],
          l,
        };
      },
    },
    ObjectField: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(node.name.l?.endToken),
            ...getComments(next(node.name.l?.endToken.next, TokenKind.COLON)),
            ...node.name.p,
            text(":"),
            SPACE,
            ...node.value.p,
          ],
          l,
        };
      },
    },
    ObjectTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("type "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.interfaces)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.NAME)
            ),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printFieldDefinitionSet(node.fields)),
          ],
          l,
        };
      },
    },
    ObjectTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend type "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.interfaces)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.NAME)
            ),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printFieldDefinitionSet(node.fields)),
          ],
          l,
        };
      },
    },
    ObjectValue: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: isEmpty(node.fields)
            ? [
                ...getComments(l?.startToken),
                text(TokenKind.BRACE_L),
                ...getComments(l?.endToken),
                text(TokenKind.BRACE_R),
              ]
            : printWrappedListWithComments(
                node.fields,
                BRACES,
                [SPACE],
                [text(","), SPACE]
              ),
          l,
        };
      },
    },
    OperationDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const keywordToken = l?.startToken;

        // Query shorthand
        if (keywordToken?.kind === TokenKind.BRACE_L) return node.selectionSet;

        return {
          p: [
            ...getComments(keywordToken),
            ...getComments(node.name?.l?.endToken),
            text(node.operation as unknown as OperationTypeNode),
            ...(node.name ? [text(" "), ...node.name.p] : []),
            ...(isEmpty(node.variableDefinitions)
              ? []
              : printWrappedListWithComments(
                  node.variableDefinitions,
                  PARENS,
                  [],
                  [text(","), SPACE]
                )),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(node.selectionSet.p),
          ],
          l,
        };
      },
    },
    OperationTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.COLON)),
            text(node.operation as unknown as OperationTypeNode),
            text(":"),
            SPACE,
            ...node.type.p,
          ],
          l,
        };
      },
    },
    ScalarTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("scalar "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    ScalarTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend scalar "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
    SchemaDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = getComments(next(l?.startToken, TokenKind.NAME));

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("schema"),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printOperationTypeDefinitionSet(node.operationTypes)),
          ],
          l,
        };
      },
    },
    SchemaExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            text("extend schema"),
            ...withSpace(join(node.directives || [], [SPACE])),
            ...withSpace(printOperationTypeDefinitionSet(node.operationTypes)),
          ],
          l,
        };
      },
    },
    SelectionSet: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: printWrappedListWithComments(
            node.selections,
            BRACES,
            [],
            [text(",")],
            true
          ),
          l,
        };
      },
    },
    StringValue: {
      leave(node) {
        /**
         * We don't use `getCommentsForToken` here because of the special case
         * where block string tokens are the only kinds of tokens that might
         * span multiple lines, and `graphql-js` only provides the starting
         * line for a token in `token.line` but not the ending line. (Instead
         * we calculate that ourselves by looking at the complete source body.)
         */

        const l = node.loc as Location;
        const token = l?.endToken;

        const comments: Comment[] = [];
        if (preserveComments && l && token) {
          let running = token.prev;
          while (
            running?.kind === TokenKind.COMMENT &&
            running.line !== running.prev?.line
          ) {
            comments.unshift({ type: "block_comment", token: running });
            running = running.prev;
          }

          const line =
            token.kind === TokenKind.BLOCK_STRING
              ? l.source.body.slice(0, token.end).split("\n").length
              : token.line;
          if (
            token.next?.kind === TokenKind.COMMENT &&
            token.next.line === line
          )
            comments.push({ type: "inline_comment", token: token.next });
        }

        return {
          p: [
            ...comments,
            ...((node.block as unknown as boolean)
              ? [
                  text('"""'),
                  ...(/[\n\r]/.test(node.value as unknown as string)
                    ? [hardLine()]
                    : []),
                  text(
                    (node.value as unknown as string).replace(/"""/g, '\\"""')
                  ),
                  ...(/[\n\r]/.test(node.value as unknown as string)
                    ? [hardLine()]
                    : []),
                  text('"""'),
                ]
              : [text(JSON.stringify(node.value))]),
          ],
          l,
        };
      },
    },
    UnionTypeDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const comments = [
          ...getComments(next(l?.startToken, TokenKind.NAME)),
          ...getComments(node.name.l?.endToken),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("union "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...printDelimitedList(
              node.types,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.types)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.EQUALS)
            ),
          ],
          l,
        };
      },
    },
    UnionTypeExtension: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(next(l?.startToken.next, TokenKind.NAME)),
            ...getComments(node.name.l?.endToken),
            text("extend union "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...printDelimitedList(
              node.types,
              node.kind as unknown as DelimitedListKinds,
              isEmpty(node.types)
                ? null
                : next(node.name.l?.endToken.next, TokenKind.EQUALS)
            ),
          ],
          l,
        };
      },
    },
    Variable: {
      leave(node) {
        const l = node.loc as Location;
        return {
          p: [
            ...getComments(l?.startToken),
            ...getComments(l?.endToken),
            text("$"),
            ...node.name.p,
          ],
          l,
        };
      },
    },
    VariableDefinition: {
      leave(node) {
        const l = node.loc as Location;

        const { comments, rest } = filterComments(node.variable.p);

        return {
          p: [
            ...comments,
            ...getComments(next(l?.startToken.next, TokenKind.COLON)),
            ...rest,
            text(":"),
            SPACE,
            ...node.type.p,
            ...printDefaultValue(node.defaultValue),
            ...withSpace(join(node.directives || [], [SPACE])),
          ],
          l,
        };
      },
    },
  });

  const resolveComments = list.p.reduce<(Text | SoftLine | HardLine)[]>(
    (acc, item) => {
      switch (item.type) {
        case "block_comment":
        case "inline_comment":
          if (preserveComments) {
            if (acc.length > 0) {
              const type = acc[acc.length - 1].type;
              if (type === "text") acc.push(hardLine());
              else if (type === "soft_line") acc[acc.length - 1] = hardLine();
            }
            acc.push(
              ...join(
                item.token.value
                  .trim()
                  .split("\n")
                  .map((line) => ({
                    p: [text("#"), SPACE, text(line)],
                    l: undefined,
                  })),
                [hardLine()]
              )
            );
            acc.push(hardLine());
          }
          break;
        default:
          acc.push(item);
          break;
      }
      return acc;
    },
    []
  );

  let printed = "";
  let currentLine: (Text | SoftLine)[] = [];
  let indentation = "";

  function handleIndentation(i?: Indentation) {
    if (i === "+") indentation += indentationStep;
    if (i === "-") indentation = indentation.slice(indentationStep.length);
  }

  function printLine(list: (Text | SoftLine)[], breakLines: boolean) {
    let printed = "";
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      switch (item.type) {
        case "text":
          printed += item.value;
          break;
        case "soft_line":
          if (breakLines) {
            printed = printed.trimEnd();
            handleIndentation(item.indentation);
            printed += "\n" + indentation;
            for (const prefix of item.prefix) printed += prefix.value;
          } else {
            for (const alt of item.alt) printed += alt.value;
          }
          break;
      }
    }
    return printed.trimEnd();
  }

  function printCurrentLine() {
    const printedLine = indentation + printLine(currentLine, false);
    if (minified || printedLine.length <= maxLineLength) {
      printed += printedLine;
    } else {
      printed += indentation;
      printed += printLine(currentLine, true);
    }

    currentLine = [];
  }

  for (const item of resolveComments) {
    if (item.type === "hard_line") {
      printCurrentLine();
      handleIndentation(item.indentation);
      printed += "\n";
    } else {
      currentLine.push(item);
    }
  }
  printCurrentLine();
  return printed.replace(/^\n*/, "").replace(/\n*$/, minified ? "" : "\n");
}

function filterComments(tokens: PrintToken[]) {
  return tokens.reduce<{
    comments: Comment[];
    rest: (Text | SoftLine | HardLine)[];
  }>(
    (acc, printToken) => {
      switch (printToken.type) {
        case "block_comment":
        case "inline_comment":
          acc.comments.push(printToken);
          break;
        default:
          acc.rest.push(printToken);
          break;
      }
      return acc;
    },
    { comments: [], rest: [] }
  );
}

function prev(token: Maybe<Token>, kind: TokenKind) {
  while (token && token.kind !== kind) token = token.prev;
  return token;
}

function next(token: Maybe<Token>, kind: TokenKind, value?: string) {
  while (
    token &&
    !(token.kind === kind && (value ? token.value === value : true))
  )
    token = token.next;
  return token;
}

function isEmpty<T>(list: Maybe<readonly T[]>): list is null | undefined {
  return !list || list.length === 0;
}

function join<T extends TransformedNode, S extends PrintToken>(
  list: readonly T[],
  delimiter: S[]
) {
  const joined: (S | T["p"][number])[] = [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0) joined.push(...delimiter);
    const item = list[i];
    joined.push(...item.p);
  }
  return joined;
}

function hasHardLine(list: readonly TransformedNode[]) {
  for (let i = 0; i < list.length; i++)
    for (let j = 0; j < list[i].p.length; j++) {
      const item = list[i].p[j];
      if (
        item.type === "hard_line" ||
        item.type === "block_comment" ||
        item.type === "inline_comment"
      )
        return true;
    }
  return false;
}
