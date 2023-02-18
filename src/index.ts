import { ASTNode, Kind, Location, Token, TokenKind } from "graphql";

import { visit } from "./visitor";

type Maybe<T> = T | null | undefined;

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

type Comment = { t: "comment"; v: string };

type PrintToken = Text | SoftLine | HardLine | Comment;

type TransformedNode = { p: PrintToken[]; l: Location | undefined };

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
  if (!Array.isArray(node)) return printAST(node, options);

  let printed = "";
  for (let i = 0; i < node.length; i++) {
    if (i > 0) printed += "\n";
    printed += printAST(node[i], options);
  }
  return printed;
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

  const source = ast.loc?.source.body;

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
        comments.splice(currentComments, 0, { t: "comment", v: running.value });
        running = running.prev;
      }

      const line =
        token.kind === TokenKind.BLOCK_STRING && source
          ? source.slice(0, token.end).split("\n").length
          : token.line;
      if (token.next?.kind === TokenKind.COMMENT && token.next.line === line)
        comments.push({ t: "comment", v: token.next.value });
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
    parentKind:
      | Kind.OBJECT_TYPE_DEFINITION
      | Kind.OBJECT_TYPE_EXTENSION
      | Kind.INTERFACE_TYPE_DEFINITION
      | Kind.INTERFACE_TYPE_EXTENSION
      | Kind.UNION_TYPE_DEFINITION
      | Kind.UNION_TYPE_EXTENSION
      | Kind.DIRECTIVE_DEFINITION
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

  function printDirectives(
    directives: Maybe<readonly TransformedNode[]>
  ): PrintToken[] {
    return withSpace(join(directives || [], [SPACE]));
  }

  const list = visit<TransformedNode>(ast, {
    Argument(node) {
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
        l: node.loc,
      };
    },
    BooleanValue(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), text("" + node.value)],
        l,
      };
    },
    Directive(node) {
      const l = node.loc;
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
    DirectiveDefinition(node) {
      const l = node.loc;

      const keywordToken: Maybe<Token> = next(l?.startToken, TokenKind.NAME);
      const atToken = next(keywordToken?.next, TokenKind.AT);

      const repeatableComments = node.repeatable
        ? getComments(
            prev(node.locations[0]?.l?.startToken, TokenKind.NAME, "repeatable")
          )
        : [];

      const locations = printDelimitedList(node.locations, node.kind);

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
          ...printInputValueDefinitionSet(node.arguments, node.kind),
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
    Document(node) {
      const l = node.loc;
      return {
        p: [
          ...join(node.definitions, [
            hardLine(),
            ...(minified ? [] : [hardLine()]),
          ]),
          ...(minified ? [] : [hardLine(), hardLine()]),
          ...getComments(l?.endToken),
        ],
        l,
      };
    },
    EnumTypeDefinition(node) {
      const l = node.loc;

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
          ...printDirectives(node.directives),
          ...withSpace(printEnumValueDefinitionSet(node.values)),
        ],
        l,
      };
    },
    EnumTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend enum "),
          ...node.name.p,
          ...printDirectives(node.directives),
          ...withSpace(printEnumValueDefinitionSet(node.values)),
        ],
        l,
      };
    },
    EnumValue(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), text(node.value)],
        l,
      };
    },
    EnumValueDefinition(node) {
      const comments = getComments(node.name.l?.endToken);
      return {
        p: [
          ...printDescription(node.description, comments),
          ...comments,
          ...node.name.p,
          ...printDirectives(node.directives),
        ],
        l: node.loc,
      };
    },
    Field(node) {
      const l = node.loc;
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
          ...printDirectives(node.directives),
          ...withSpace(node.selectionSet?.p || []),
        ],
        l,
      };
    },
    FieldDefinition(node) {
      const colonToken = prev(node.type.l?.startToken.prev, TokenKind.COLON);
      const comments = getComments(node.name.l?.endToken, colonToken);

      return {
        p: [
          ...printDescription(node.description, comments),
          ...comments,
          ...node.name.p,
          ...printInputValueDefinitionSet(node.arguments, node.kind),
          text(":"),
          SPACE,
          ...node.type.p,
          ...printDirectives(node.directives),
        ],
        l: node.loc,
      };
    },
    FloatValue(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), text(node.value)],
        l,
      };
    },
    FragmentDefinition(node) {
      const l = node.loc;
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
          ...printDirectives(node.directives),
          ...withSpace(node.selectionSet.p),
        ],
        l,
      };
    },
    FragmentSpread(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(l?.startToken, node.name.l?.endToken),
          text("..."),
          ...node.name.p,
          ...printDirectives(node.directives),
        ],
        l,
      };
    },
    InlineFragment(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            node.typeCondition
              ? prev(node.typeCondition.l?.endToken.prev, TokenKind.NAME)
              : null
          ),
          text("..."),
          ...(node.typeCondition ? [text("on "), ...node.typeCondition.p] : []),
          ...printDirectives(node.directives),
          ...withSpace(node.selectionSet.p),
        ],
        l,
      };
    },
    InputObjectTypeDefinition(node) {
      const l = node.loc;

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
          ...printDirectives(node.directives),
          ...withSpace(printInputValueDefinitionSet(node.fields, node.kind)),
        ],
        l,
      };
    },
    InputObjectTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken?.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend input "),
          ...node.name.p,
          ...printDirectives(node.directives),
          ...withSpace(printInputValueDefinitionSet(node.fields, node.kind)),
        ],
        l,
      };
    },
    InputValueDefinition(node) {
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
          ...printDirectives(node.directives),
        ],
        l: node.loc,
      };
    },
    InterfaceTypeDefinition(node) {
      const l = node.loc;

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
          ...printDelimitedList(node.interfaces, node.kind),
          ...printDirectives(node.directives),
          ...withSpace(printFieldDefinitionSet(node.fields)),
        ],
        l,
      };
    },
    InterfaceTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend interface "),
          ...node.name.p,
          ...printDelimitedList(node.interfaces, node.kind),
          ...printDirectives(node.directives),
          ...withSpace(printFieldDefinitionSet(node.fields)),
        ],
        l,
      };
    },
    IntValue(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), text(node.value)],
        l,
      };
    },
    ListType(node) {
      const l = node.loc;
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
    ListValue(node) {
      const l = node.loc;
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
    Name(node) {
      return { p: [text(node.value)], l: node.loc };
    },
    NamedType(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), ...node.name.p],
        l,
      };
    },
    NonNullType(node) {
      const l = node.loc;
      const { comments, rest } = filterComments(node.type.p);
      return {
        p: [...comments, ...getComments(l?.endToken), ...rest, text("!")],
        l,
      };
    },
    NullValue(node) {
      const l = node.loc;
      return {
        p: [...getComments(l?.endToken), text("null")],
        l,
      };
    },
    ObjectField(node) {
      const l = node.loc;
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
    ObjectTypeDefinition(node) {
      const l = node.loc;

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
          ...printDelimitedList(node.interfaces, node.kind),
          ...printDirectives(node.directives),
          ...withSpace(printFieldDefinitionSet(node.fields)),
        ],
        l,
      };
    },
    ObjectTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend type "),
          ...node.name.p,
          ...printDelimitedList(node.interfaces, node.kind),
          ...printDirectives(node.directives),
          ...withSpace(printFieldDefinitionSet(node.fields)),
        ],
        l,
      };
    },
    ObjectValue(node) {
      const l = node.loc;
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
    OperationDefinition(node) {
      const l = node.loc;

      const keywordToken = l?.startToken;

      // Query shorthand
      if (keywordToken?.kind === TokenKind.BRACE_L) return node.selectionSet;

      return {
        p: [
          ...getComments(keywordToken, node.name?.l?.endToken),
          text(node.operation),
          ...(node.name ? [text(" "), ...node.name.p] : []),
          ...(isEmpty(node.variableDefinitions)
            ? []
            : printWrappedListWithComments(
                node.variableDefinitions,
                PARENS,
                "",
                "," + SPACE.v
              )),
          ...printDirectives(node.directives),
          ...withSpace(node.selectionSet.p),
        ],
        l,
      };
    },
    OperationTypeDefinition(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.COLON)
          ),
          text(node.operation),
          text(":"),
          SPACE,
          ...node.type.p,
        ],
        l,
      };
    },
    ScalarTypeDefinition(node) {
      const l = node.loc;

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
          ...printDirectives(node.directives),
        ],
        l,
      };
    },
    ScalarTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend scalar "),
          ...node.name.p,
          ...printDirectives(node.directives),
        ],
        l,
      };
    },
    SchemaDefinition(node) {
      const l = node.loc;

      const comments = getComments(next(l?.startToken, TokenKind.NAME));

      return {
        p: [
          ...printDescription(node.description, comments),
          ...comments,
          text("schema"),
          ...printDirectives(node.directives),
          ...withSpace(printOperationTypeDefinitionSet(node.operationTypes)),
        ],
        l,
      };
    },
    SchemaExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME)
          ),
          text("extend schema"),
          ...printDirectives(node.directives),
          ...withSpace(printOperationTypeDefinitionSet(node.operationTypes)),
        ],
        l,
      };
    },
    SelectionSet(node) {
      return {
        p: printWrappedListWithComments(node.selections, BRACES, "", ",", true),
        l: node.loc,
      };
    },
    StringValue(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(l?.endToken),
          ...(node.block
            ? [
                text('"""'),
                ...(/[\n\r]/.test(node.value) ? [hardLine()] : []),
                text(node.value.replace(/"""/g, '\\"""')),
                ...(/[\n\r]/.test(node.value) ? [hardLine()] : []),
                text('"""'),
              ]
            : [text(JSON.stringify(node.value))]),
        ],
        l,
      };
    },
    UnionTypeDefinition(node) {
      const l = node.loc;

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
          ...printDirectives(node.directives),
          ...printDelimitedList(node.types, node.kind),
        ],
        l,
      };
    },
    UnionTypeExtension(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(
            l?.startToken,
            next(l?.startToken.next, TokenKind.NAME),
            node.name.l?.endToken
          ),
          text("extend union "),
          ...node.name.p,
          ...printDirectives(node.directives),
          ...printDelimitedList(node.types, node.kind),
        ],
        l,
      };
    },
    Variable(node) {
      const l = node.loc;
      return {
        p: [
          ...getComments(l?.startToken, l?.endToken),
          text("$"),
          ...node.name.p,
        ],
        l,
      };
    },
    VariableDefinition(node) {
      const l = node.loc;

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
          ...printDirectives(node.directives),
        ],
        l,
      };
    },
  });

  /** To make sure the last line is always printed */
  list.p.push(hardLine());

  let printed = "";
  let withoutSoftLineBreaks = "";
  let withSoftLineBreaks = "";
  let indentation = "";

  function handleIndentation(i?: Indentation): void {
    if (minified) return;
    if (i === "+") indentation += indentationStep;
    if (i === "-") indentation = indentation.slice(indentationStep.length);
  }

  for (let i = 0; i < list.p.length; i++) {
    const item = list.p[i];
    const isNextComment =
      i < list.p.length - 1 && list.p[i + 1].t === "comment";
    if (item.t === "hard_line" || (item.t === "soft_line" && isNextComment)) {
      withoutSoftLineBreaks = withoutSoftLineBreaks.trimEnd();
      withSoftLineBreaks = withSoftLineBreaks.trimEnd();

      printed +=
        indentation +
        (minified ||
        indentation.length + withoutSoftLineBreaks.length <= maxLineLength
          ? withoutSoftLineBreaks
          : withSoftLineBreaks);

      handleIndentation(item.i);
      printed += "\n";

      withoutSoftLineBreaks = "";
      withSoftLineBreaks = "";
    } else if (item.t === "soft_line") {
      withSoftLineBreaks = withSoftLineBreaks.trimEnd();
      handleIndentation(item.i);
      withSoftLineBreaks += "\n" + indentation;
      withSoftLineBreaks += item.p;

      withoutSoftLineBreaks += item.a;
    } else if (item.t === "text") {
      withoutSoftLineBreaks += item.v;
      withSoftLineBreaks += item.v;
      if (isNextComment) list.p.splice(i + 1, 0, hardLine());
    } else if (preserveComments) {
      printed += indentation + "#" + SPACE.v + item.v.trim() + "\n";
    }
  }
  return printed.trim() + (minified ? "" : "\n");
}

type FilteredComments = {
  comments: Comment[];
  rest: (Text | SoftLine | HardLine)[];
};

function filterComments(tokens: PrintToken[]): FilteredComments {
  const comments: Comment[] = [];
  const rest: (Text | SoftLine | HardLine)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.t === "comment") comments.push(token);
    else rest.push(token);
  }
  return { comments, rest };
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
    joined.push(...list[i].p);
  }
  return joined;
}

function hasHardLine(list: readonly TransformedNode[]): boolean {
  for (let i = 0; i < list.length; i++)
    for (let j = 0; j < list[i].p.length; j++) {
      const item = list[i].p[j];
      if (item.t === "hard_line" || item.t === "comment") return true;
    }
  return false;
}
