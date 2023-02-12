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

type Text = { t: "text"; v: string };

type SoftLine = {
  t: "soft_line";
  /** The characters that should be printed if no linebreak is necessary */
  a: string;
  /** A prefix that should be printed if a linebreak is necessary */
  p: string;
  i?: Indentation;
};

type HardLine = { t: "hard_line"; i?: Indentation };

type Comment = { t: "block_comment" | "inline_comment"; v: string };

type PrintToken = Text | SoftLine | HardLine | Comment;

type TransformedNode = { p: PrintToken[]; l: Location };

function text(value: string): Text {
  return { t: "text", v: value };
}

function softLine(
  alt: string,
  prefix = "",
  indentation?: Indentation
): SoftLine {
  return { t: "soft_line", a: alt, p: prefix, i: indentation };
}

function hardLine(indentation?: Indentation): HardLine {
  return { t: "hard_line", i: indentation };
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

export function print(
  node: ASTNode | ASTNode[],
  options: PrintOptions = {}
): string {
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
  const SPACE: Text = { t: "text", v: minified ? "" : " " };

  function getComments(
    ...tokens: [Maybe<Token>, ...Maybe<Token>[]]
  ): Comment[] {
    if (!preserveComments) return [];

    const comments: Comment[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      const currentComments = comments.length;

      let running = token.prev;
      while (
        running?.kind === TokenKind.COMMENT &&
        running.line !== running.prev?.line
      ) {
        comments.splice(currentComments, 0, {
          t: "block_comment",
          v: running.value,
        });
        running = running.prev;
      }

      const line = token.kind === TokenKind.BLOCK_STRING ? 0 : token.line;
      if (token.next?.kind === TokenKind.COMMENT && token.next.line === line)
        comments.push({ t: "inline_comment", v: token.next.value });
    }

    return comments;
  }

  function printWrappedListWithComments(
    list: readonly TransformedNode[],
    [open, close]: readonly [TokenKind, TokenKind],
    spacer: string,
    delimiter: string,
    forceMultiLine = false
  ): PrintToken[] {
    const openingBracket = getComments(prev(list[0].l?.startToken, open));
    const closingBracket = getComments(
      next(list[list.length - 1].l?.endToken, close)
    );

    const shouldPrintMultiLine =
      !minified &&
      (forceMultiLine || closingBracket.length > 0 || hasHardLine(list));

    return [
      ...openingBracket,
      text(open),
      shouldPrintMultiLine ? hardLine("+") : softLine(spacer, undefined, "+"),
      ...join(list, [shouldPrintMultiLine ? hardLine() : softLine(delimiter)]),
      shouldPrintMultiLine
        ? hardLine("-")
        : softLine(closingBracket.length > 0 ? "\n" : spacer, undefined, "-"),
      ...closingBracket,
      text(close),
    ];
  }

  function printArgumentSet(
    args: Maybe<readonly TransformedNode[]>
  ): PrintToken[] {
    if (isEmpty(args)) return [];
    return printWrappedListWithComments(args, PARENS, "", "," + SPACE.v);
  }

  function printInputValueDefinitionSet(
    inputValueDefinitions: Maybe<readonly TransformedNode[]>,
    parentKind: Kind
  ): PrintToken[] {
    if (isEmpty(inputValueDefinitions)) return [];

    const [openAndClose, forceMultiline] =
      parentKind === Kind.DIRECTIVE_DEFINITION ||
      parentKind === Kind.FIELD_DEFINITION
        ? [PARENS, false]
        : [BRACES, true];

    return printWrappedListWithComments(
      inputValueDefinitions,
      openAndClose,
      "",
      ",",
      forceMultiline
    );
  }

  function printOperationTypeDefinitionSet(
    operationTypes: Maybe<readonly TransformedNode[]>
  ): PrintToken[] {
    if (isEmpty(operationTypes)) return [];
    return printWrappedListWithComments(operationTypes, BRACES, "", ",", true);
  }

  function printEnumValueDefinitionSet(
    definitions: Maybe<readonly TransformedNode[]>
  ): PrintToken[] {
    if (isEmpty(definitions)) return [];
    return printWrappedListWithComments(definitions, BRACES, "", ",", true);
  }

  function printFieldDefinitionSet(
    fields: Maybe<readonly TransformedNode[]>
  ): PrintToken[] {
    if (isEmpty(fields)) return [];
    return printWrappedListWithComments(fields, BRACES, "", ",", true);
  }

  function printDelimitedList(
    items: Maybe<readonly TransformedNode[]>,
    parentKind: DelimitedListKinds
  ): PrintToken[] {
    if (isEmpty(items)) return [];

    const [initializerKind, initializerValue, wrapInitializer, delimiterKind] =
      parentKind === Kind.UNION_TYPE_DEFINITION ||
      parentKind === Kind.UNION_TYPE_EXTENSION
        ? [TokenKind.EQUALS, undefined, SPACE, TokenKind.PIPE]
        : parentKind === Kind.DIRECTIVE_DEFINITION
        ? [TokenKind.NAME, "on", text(" "), TokenKind.PIPE]
        : [TokenKind.NAME, "implements", text(" "), TokenKind.AMP];

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

    const itemList: PrintToken[] = getComments(
      prev(items[0].l?.startToken.prev, initializerKind, initializerValue)
    );
    if (itemList.length === 0) itemList.push(wrapInitializer);
    itemList.push(text(initializerValue || initializerKind), wrapInitializer);

    for (let i = 0; i < itemsWithComments.length; i++) {
      itemList.push(...itemsWithComments[i].comments);

      if (minified && i > 0) itemList.push(text(delimiterKind));

      if (!minified) {
        if (hasComments && itemsWithComments[i].comments.length === 0)
          itemList.push(hardLine());
        if (hasComments) itemList.push(text(delimiterKind + " "));
        else
          itemList.push(
            softLine(
              i === 0 ? "" : " " + delimiterKind + " ",
              delimiterKind + " "
            )
          );
      }

      itemList.push(...itemsWithComments[i].type);
    }

    return itemList;
  }

  function withSpace(list: Maybe<PrintToken[]>): PrintToken[] {
    return isEmpty(list) ? [] : [SPACE, ...list];
  }

  function printDescription(
    description: Maybe<TransformedNode>,
    comments: Comment[]
  ): PrintToken[] {
    return description
      ? [
          ...description.p,
          ...(!minified && (!preserveComments || comments.length === 0)
            ? [hardLine()]
            : []),
        ]
      : [];
  }

  function printDefaultValue(node: Maybe<TransformedNode>): PrintToken[] {
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
            ...getComments(
              node.name.l?.endToken,
              next(node.name.l?.endToken.next, TokenKind.COLON)
            ),
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
            ...getComments(l?.startToken, node.name.l?.endToken),
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

        const repeatableComments = node.repeatable
          ? getComments(
              prev(
                node.locations[0]?.l?.startToken,
                TokenKind.NAME,
                "repeatable"
              )
            )
          : [];

        const locations = printDelimitedList(
          node.locations,
          node.kind as unknown as DelimitedListKinds
        );

        const comments = getComments(
          keywordToken,
          atToken,
          node.name.l?.endToken
        );

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
                while (definition.p[0].t === "hard_line") definition.p.shift();
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

        const comments = getComments(
          next(l?.startToken, TokenKind.NAME),
          node.name.l?.endToken
        );

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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
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
            ...getComments(
              node.alias?.l?.endToken,
              node.alias ? next(l?.startToken?.next, TokenKind.COLON) : null,
              node.name.l?.endToken
            ),
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
        const comments = getComments(node.name.l?.endToken, colonToken);

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
            ...getComments(
              l?.startToken,
              node.name.l?.endToken,
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
            ...getComments(l?.startToken, node.name.l?.endToken),
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
            ...getComments(
              l?.startToken,
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

        const comments = getComments(
          next(l?.startToken, TokenKind.NAME),
          node.name.l?.endToken
        );

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
            ...getComments(
              l?.startToken,
              next(l?.startToken?.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
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

        const comments = getComments(
          node.name.l?.endToken,
          next(node.name.l?.endToken.next, TokenKind.COLON)
        );

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

        const comments = getComments(
          next(l?.startToken, TokenKind.NAME),
          node.name.l?.endToken
        );

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("interface "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds
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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
            text("extend interface "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds
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
                "",
                "," + SPACE.v
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
            ...getComments(
              node.name.l?.endToken,
              next(node.name.l?.endToken.next, TokenKind.COLON)
            ),
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
          ...getComments(
            next(l?.startToken, TokenKind.NAME),
            node.name.l?.endToken
          ),
        ];

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("type "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds
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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
            text("extend type "),
            ...node.name.p,
            ...printDelimitedList(
              node.interfaces,
              node.kind as unknown as DelimitedListKinds
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
                SPACE.v,
                "," + SPACE.v
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
            ...getComments(keywordToken, node.name?.l?.endToken),
            text(node.operation as unknown as OperationTypeNode),
            ...(node.name ? [text(" "), ...node.name.p] : []),
            ...(isEmpty(node.variableDefinitions)
              ? []
              : printWrappedListWithComments(
                  node.variableDefinitions,
                  PARENS,
                  "",
                  "," + SPACE.v
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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.COLON)
            ),
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

        const comments = getComments(
          next(l?.startToken, TokenKind.NAME),
          node.name.l?.endToken
        );

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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME)
            ),
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
            "",
            ",",
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
            comments.unshift({ t: "block_comment", v: running.value });
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
            comments.push({ t: "inline_comment", v: token.next.value });
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

        const comments = getComments(
          next(l?.startToken, TokenKind.NAME),
          node.name.l?.endToken
        );

        return {
          p: [
            ...printDescription(node.description, comments),
            ...comments,
            text("union "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...printDelimitedList(
              node.types,
              node.kind as unknown as DelimitedListKinds
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
            ...getComments(
              l?.startToken,
              next(l?.startToken.next, TokenKind.NAME),
              node.name.l?.endToken
            ),
            text("extend union "),
            ...node.name.p,
            ...withSpace(join(node.directives || [], [SPACE])),
            ...printDelimitedList(
              node.types,
              node.kind as unknown as DelimitedListKinds
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
            ...getComments(l?.startToken, l?.endToken),
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
      switch (item.t) {
        case "block_comment":
        case "inline_comment":
          if (preserveComments) {
            if (acc.length > 0) {
              const type = acc[acc.length - 1].t;
              if (type === "text") acc.push(hardLine());
              else if (type === "soft_line") acc[acc.length - 1] = hardLine();
            }
            acc.push(
              ...join(
                item.v
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

  function handleIndentation(i?: Indentation): void {
    if (i === "+") indentation += indentationStep;
    if (i === "-") indentation = indentation.slice(indentationStep.length);
  }

  function printLine(list: (Text | SoftLine)[], breakLines: boolean): string {
    let printed = "";
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      switch (item.t) {
        case "text":
          printed += item.v;
          break;
        case "soft_line":
          if (breakLines) {
            printed = printed.trimEnd();
            handleIndentation(item.i);
            printed += "\n" + indentation;
            printed += item.p;
          } else {
            printed += item.a;
          }
          break;
      }
    }
    return printed.trimEnd();
  }

  function printCurrentLine(): void {
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
    if (item.t === "hard_line") {
      printCurrentLine();
      handleIndentation(item.i);
      printed += "\n";
    } else {
      currentLine.push(item);
    }
  }
  printCurrentLine();
  return printed.replace(/^\n*/, "").replace(/\n*$/, minified ? "" : "\n");
}

type FilteredComments = {
  comments: Comment[];
  rest: (Text | SoftLine | HardLine)[];
};

function filterComments(tokens: PrintToken[]): FilteredComments {
  return tokens.reduce<FilteredComments>(
    (acc, printToken) => {
      switch (printToken.t) {
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

function prev(
  token: Maybe<Token>,
  kind: TokenKind,
  value?: string
): Maybe<Token> {
  while (
    token &&
    !(token.kind === kind && (value ? token.value === value : true))
  )
    token = token.prev;
  return token;
}

function next(
  token: Maybe<Token>,
  kind: TokenKind,
  value?: string
): Maybe<Token> {
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
): (S | T["p"][number])[] {
  const joined: (S | T["p"][number])[] = [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0) joined.push(...delimiter);
    const item = list[i];
    joined.push(...item.p);
  }
  return joined;
}

function hasHardLine(list: readonly TransformedNode[]): boolean {
  for (let i = 0; i < list.length; i++)
    for (let j = 0; j < list[i].p.length; j++) {
      const item = list[i].p[j];
      if (
        item.t === "hard_line" ||
        item.t === "block_comment" ||
        item.t === "inline_comment"
      )
        return true;
    }
  return false;
}
