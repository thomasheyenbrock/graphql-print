// TODO: enforce explicit return types
// TODO: create helper function to find the next token of a certain kind
// TODO: instead of just returning list of print tokens, also return the original locs so that we don't have to manually search for tokens
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

function text(value: string): Text {
  return { type: "text", value };
}

function softLine(
  alt: Text | Text[],
  prefix: Text | Text[] = [],
  indentation?: Indentation
): SoftLine {
  return {
    type: "soft_line",
    alt: Array.isArray(alt) ? alt : [alt],
    prefix: Array.isArray(prefix) ? prefix : [prefix],
    indentation,
  };
}

function hardLine(indentation?: Indentation): HardLine {
  return { type: "hard_line", indentation };
}

type NamedTypeSetKinds =
  | Kind.OBJECT_TYPE_DEFINITION
  | Kind.OBJECT_TYPE_EXTENSION
  | Kind.INTERFACE_TYPE_DEFINITION
  | Kind.INTERFACE_TYPE_EXTENSION
  | Kind.UNION_TYPE_DEFINITION
  | Kind.UNION_TYPE_EXTENSION;

type PrintOptions = {
  indentationStep?: string;
  maxLineLength?: number;
  preserveComments?: boolean;
  pretty?: boolean;
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
    pretty = false,
  }: PrintOptions
): string {
  const SPACE: Text = { type: "text", value: pretty ? " " : "" };

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
    list: readonly PrintToken[][],
    openingBracketPunctuator: Text,
    spacer: Text[],
    delimiter: Text[],
    closingBracketPunctuator: Text,
    startToken: Maybe<Token>,
    endToken: Maybe<Token>,
    forceMultiLine: boolean = false
  ) {
    const openingBracket = getComments(startToken);
    const closingBracket = getComments(endToken);

    const shouldPrintMultiLine =
      pretty &&
      (forceMultiLine || hasHardLine(list) || closingBracket.length > 0);

    return [
      ...openingBracket,
      openingBracketPunctuator,
      shouldPrintMultiLine ? hardLine("+") : softLine(spacer, undefined, "+"),
      ...join(list, [shouldPrintMultiLine ? hardLine() : softLine(delimiter)]),
      shouldPrintMultiLine
        ? hardLine("-")
        : softLine(
            closingBracket.length > 0 ? text("\n") : spacer,
            undefined,
            "-"
          ),
      ...closingBracket,
      closingBracketPunctuator,
    ];
  }

  function printArgumentSet(
    args: Maybe<readonly PrintToken[][]>,
    maybeStart: Maybe<Token>,
    maybeEnd?: Maybe<Token>
  ) {
    if (isEmpty(args)) return [];

    let lParenToken = maybeStart;
    while (lParenToken && lParenToken.kind !== TokenKind.PAREN_L)
      lParenToken = lParenToken.next;

    let rParenToken = maybeEnd || lParenToken;
    while (rParenToken && rParenToken.kind !== TokenKind.PAREN_R)
      rParenToken = maybeEnd ? rParenToken.prev : rParenToken.next;

    return printWrappedListWithComments(
      args,
      text("("),
      [],
      [text(","), SPACE],
      text(")"),
      lParenToken,
      rParenToken
    );
  }

  function printInputValueDefinitionSet(
    inputValueDefinitions: Maybe<readonly PrintToken[][]>,
    parentKind: Kind,
    start: Maybe<Token>,
    end: Maybe<Token>
  ) {
    if (isEmpty(inputValueDefinitions)) return [];

    const [startPunctuator, endPunctuator, forceMultiline] =
      parentKind === Kind.DIRECTIVE_DEFINITION ||
      parentKind === Kind.FIELD_DEFINITION
        ? [text("("), text(")"), false]
        : [text("{"), text("}"), true];
    return printWrappedListWithComments(
      inputValueDefinitions,
      startPunctuator,
      [],
      [text(",")],
      endPunctuator,
      start,
      end,
      forceMultiline
    );
  }

  function printOperationTypeDefinitionSet(
    operationTypes: Maybe<readonly PrintToken[][]>,
    start: Maybe<Token>,
    end: Maybe<Token>
  ) {
    if (isEmpty(operationTypes)) return [];
    return printWrappedListWithComments(
      operationTypes,
      text("{"),
      [],
      [text(",")],
      text("}"),
      start,
      end,
      true
    );
  }

  function printEnumValueDefinitionSet(
    definitions: Maybe<readonly PrintToken[][]>,
    start: Maybe<Token>,
    end: Maybe<Token>
  ) {
    if (isEmpty(definitions)) return [];
    return printWrappedListWithComments(
      definitions,
      text("{"),
      [],
      [text(",")],
      text("}"),
      start,
      end,
      true
    );
  }

  function printFieldDefinitionSet(
    fields: Maybe<readonly PrintToken[][]>,
    start: Maybe<Token>,
    end: Maybe<Token>
  ) {
    if (isEmpty(fields)) return [];
    return printWrappedListWithComments(
      fields,
      text("{"),
      [],
      [text(",")],
      text("}"),
      start,
      end,
      true
    );
  }

  function printNamedTypeSet(
    types: Maybe<readonly PrintToken[][]>,
    parentKind: NamedTypeSetKinds,
    initializerToken: Maybe<Token>,
    endToken: Maybe<Token>
  ) {
    if (isEmpty(types)) return [];
    const [initializer, wrapInitializer, delimiterKind] =
      parentKind === Kind.UNION_TYPE_DEFINITION ||
      parentKind === Kind.UNION_TYPE_EXTENSION
        ? ["=", SPACE, TokenKind.PIPE]
        : ["implements", text(" "), TokenKind.AMP];
    const initializerComments = getComments(initializerToken);

    let running = initializerToken?.next;
    while (
      running &&
      running.kind !== delimiterKind &&
      running.kind !== TokenKind.NAME
    )
      running = running.next;

    let firstNamedTypeComments: Comment[] = [];
    if (running && running.kind === delimiterKind)
      firstNamedTypeComments.push(...getComments(running));

    while (running && running.kind !== TokenKind.NAME) running = running.next;
    firstNamedTypeComments.push(...getComments(running));

    let hasComments = hasHardLine(types) || firstNamedTypeComments.length > 0;

    const typeList: PrintToken[][] = [
      [
        ...firstNamedTypeComments,
        ...(hasComments
          ? [
              ...(firstNamedTypeComments.length === 0 ? [hardLine()] : []),
              text(pretty ? delimiterKind : ""),
              SPACE,
            ]
          : [softLine(wrapInitializer, [text(delimiterKind), SPACE])]),
        ...filterComments(types[0]).rest,
      ],
    ];

    let i = 1;
    while (running && running !== endToken) {
      while (running && running.kind !== delimiterKind) running = running?.next;
      const pipeComments = getComments(running);

      while (running && running.kind !== TokenKind.NAME)
        running = running?.next;
      const typeComments = getComments(running);

      typeList.push([
        ...pipeComments,
        ...typeComments,
        ...(hasComments
          ? pipeComments.length + typeComments.length === 0
            ? [hardLine()]
            : []
          : [softLine(SPACE)]),
        text(delimiterKind),
        SPACE,
        ...filterComments(types[i]).rest,
      ]);
      hasComments =
        hasComments || pipeComments.length > 0 || typeComments.length > 0;
      i++;
    }

    return [
      ...initializerComments,
      ...(initializerComments.length > 0 ? [] : [wrapInitializer]),
      text(initializer),
      ...typeList.flat(),
    ];
  }

  function withSpace(list: Maybe<PrintToken[]>) {
    return isEmpty(list) ? [] : [SPACE, ...list];
  }

  function printDescription(
    description: Maybe<PrintToken[]>,
    comments: Comment[]
  ) {
    return description
      ? [
          ...description,
          ...(pretty && (!preserveComments || comments.length === 0)
            ? [hardLine()]
            : []),
        ]
      : [];
  }

  function printDefaultValue(node: Maybe<PrintToken[]>, token: Maybe<Token>) {
    if (!node) return [];

    const { comments, rest } = filterComments(node);

    let equalsToken = token;
    while (equalsToken && equalsToken.kind !== TokenKind.EQUALS)
      equalsToken = equalsToken.next;

    comments.unshift(...getComments(equalsToken));

    return [
      ...comments,
      ...(comments.length > 0 ? [] : [SPACE]),
      text("="),
      SPACE,
      ...rest,
    ];
  }

  const list = visit<PrintToken[]>(ast, {
    Argument: {
      leave(node) {
        const nameToken = (node.loc as Location)?.startToken;
        let colonToken = nameToken?.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;
        return [
          ...getComments(nameToken),
          ...getComments(colonToken),
          ...node.name,
          text(":"),
          SPACE,
          ...node.value,
        ];
      },
    },
    BooleanValue: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          text("" + (node.value as unknown as boolean)),
        ];
      },
    },
    Directive: {
      leave(node) {
        const loc = node.loc as Location;
        let nameToken = loc?.startToken.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        return [
          ...getComments(loc?.startToken),
          ...getComments(nameToken),
          text("@"),
          ...node.name,
          ...printArgumentSet(node.arguments, nameToken?.next, loc?.endToken),
        ];
      },
    },
    DirectiveDefinition: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let atToken = keywordToken?.next;
        while (atToken && atToken.kind !== TokenKind.AT) atToken = atToken.next;

        let nameToken = atToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lParenToken: Maybe<Token>;
        let rParenToken: Maybe<Token>;
        if (!isEmpty(node.arguments)) {
          lParenToken = nameToken?.next;
          while (lParenToken && lParenToken.kind !== TokenKind.PAREN_L)
            lParenToken = lParenToken.next;

          rParenToken = lParenToken?.next;
          while (rParenToken && rParenToken.kind !== TokenKind.PAREN_R)
            rParenToken = rParenToken.next;
        }

        let repeatableToken: Maybe<Token>;
        if (node.repeatable as unknown as boolean) {
          repeatableToken = rParenToken?.next || nameToken?.next;
          while (repeatableToken && repeatableToken.kind !== TokenKind.NAME)
            repeatableToken = repeatableToken.next;
        }
        const repeatableComments = getComments(repeatableToken);

        let onToken =
          repeatableToken?.next || rParenToken?.next || nameToken?.next;
        while (
          onToken &&
          !(onToken.kind === TokenKind.NAME && onToken.value === "on")
        )
          onToken = onToken.next;

        let running = onToken?.next;
        while (
          running &&
          running.kind !== TokenKind.PIPE &&
          running.kind !== TokenKind.NAME
        )
          running = running.next;

        let firstLocationComments: Comment[] = [];
        if (running && running.kind === TokenKind.PIPE) {
          firstLocationComments.push(...getComments(running));
        }
        while (running && running.kind !== TokenKind.NAME)
          running = running.next;
        firstLocationComments.push(...getComments(running));

        let hasComments = firstLocationComments.length > 0;

        const locations: { comments: Comment[]; location: PrintToken[] }[] = [
          { comments: firstLocationComments, location: node.locations[0] },
        ];

        let i = 1;
        while (running && running !== loc?.endToken) {
          while (running && running.kind !== TokenKind.PIPE)
            running = running?.next;
          const pipeComments = getComments(running);

          while (running && running.kind !== TokenKind.NAME)
            running = running?.next;
          const locationComments = getComments(running);

          locations.push({
            comments: [...pipeComments, ...locationComments],
            location: node.locations[i],
          });
          hasComments =
            hasComments ||
            pipeComments.length > 0 ||
            locationComments.length > 0;
          i++;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(atToken),
          ...getComments(nameToken),
        ];

        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("directive"),
          SPACE,
          text("@"),
          ...node.name,
          ...printInputValueDefinitionSet(
            node.arguments,
            node.kind as unknown as Kind,
            lParenToken,
            rParenToken
          ),
          ...repeatableComments,
          text(
            node.repeatable
              ? repeatableComments.length > 0
                ? "repeatable "
                : " repeatable "
              : " "
          ),
          ...(hasComments
            ? [
                ...getComments(onToken),
                text("on"),
                hardLine(),
                ...locations.flatMap(({ comments, location }, index) => [
                  ...comments,
                  text(!pretty && index === 0 ? "" : "|"),
                  SPACE,
                  ...location,
                ]),
              ]
            : [
                ...getComments(onToken),
                text("on"),
                softLine(text(" "), [text("|"), SPACE]),
                ...join(node.locations, [softLine(SPACE), text("|"), SPACE]),
                softLine([]),
              ]),
        ];
      },
    },
    Document: {
      leave(node) {
        const comments = getComments((node.loc as Location)?.endToken);
        return [
          ...join(
            node.definitions.map((definition) => {
              while (definition[0].type === "hard_line") definition.shift();
              return definition;
            }),
            [hardLine(), ...(pretty ? [hardLine()] : [])]
          ),
          ...(pretty && comments.length > 0 ? [hardLine(), hardLine()] : []),
          ...comments,
        ];
      },
    },
    EnumTypeDefinition: {
      leave(node) {
        let keywordToken: Maybe<Token> = (node.loc as Location)?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lBraceToken: Maybe<Token>;
        let rBraceToken: Maybe<Token>;
        if (!isEmpty(node.values)) {
          lBraceToken = nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;

          rBraceToken = lBraceToken?.next;
          while (rBraceToken && rBraceToken.kind !== TokenKind.BRACE_R)
            rBraceToken = rBraceToken.next;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];

        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("enum "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printEnumValueDefinitionSet(node.values, lBraceToken, rBraceToken)
          ),
        ];
      },
    },
    EnumTypeExtension: {
      leave(node) {
        const extendToken = (node.loc as Location)?.startToken;

        let keywordToken = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lBraceToken: Maybe<Token>;
        let rBraceToken: Maybe<Token>;
        if (!isEmpty(node.values)) {
          lBraceToken = nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;

          rBraceToken = lBraceToken?.next;
          while (rBraceToken && rBraceToken.kind !== TokenKind.BRACE_R)
            rBraceToken = rBraceToken.next;
        }

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend enum "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printEnumValueDefinitionSet(node.values, lBraceToken, rBraceToken)
          ),
        ];
      },
    },
    EnumValue: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          text(node.value as unknown as string),
        ];
      },
    },
    EnumValueDefinition: {
      leave(node) {
        let nameToken: Maybe<Token> = (node.loc as Location)?.startToken;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;
        const comments = getComments(nameToken);
        return [
          ...printDescription(node.description, comments),
          ...comments,
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    Field: {
      leave(node) {
        const aliasToken = (node.loc as Location)?.startToken;
        let colonToken: Maybe<Token>;
        let nameToken: Maybe<Token>;
        if (node.alias) {
          colonToken = aliasToken?.next;
          while (colonToken && colonToken.kind !== TokenKind.COLON)
            colonToken = colonToken.next;

          nameToken = colonToken?.next;
          while (nameToken && nameToken.kind !== TokenKind.NAME)
            nameToken = nameToken.next;
        }
        return [
          ...getComments(aliasToken),
          ...getComments(colonToken),
          ...getComments(nameToken),
          ...(node.alias ? [...node.alias, text(":"), SPACE] : []),
          ...node.name,
          ...printArgumentSet(node.arguments, nameToken?.next),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(node.selectionSet || []),
        ];
      },
    },
    FieldDefinition: {
      leave(node) {
        let nameToken: Maybe<Token> = (node.loc as Location)?.startToken;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lParen: Maybe<Token>;
        let rParen: Maybe<Token>;
        if (node.arguments) {
          lParen = nameToken?.next;
          while (lParen && lParen.kind !== TokenKind.PAREN_L)
            lParen = lParen.next;

          rParen = lParen?.next;
          while (rParen && rParen.kind !== TokenKind.PAREN_R)
            rParen = rParen.next;
        }

        let colonToken = rParen?.next || nameToken?.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;

        const comments = [
          ...getComments(nameToken),
          ...getComments(colonToken),
        ];
        return [
          ...printDescription(node.description, comments),
          ...comments,
          ...node.name,
          ...printInputValueDefinitionSet(
            node.arguments,
            node.kind as unknown as Kind,
            lParen,
            rParen
          ),
          text(":"),
          SPACE,
          ...node.type,
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    FloatValue: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          text(node.value as unknown as string),
        ];
      },
    },
    FragmentDefinition: {
      leave(node) {
        const keywordToken = (node.loc as Location)?.startToken;
        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;
        let onToken = nameToken?.next;
        while (onToken && onToken.kind !== TokenKind.NAME)
          onToken = onToken.next;
        return [
          ...getComments(keywordToken),
          ...getComments(nameToken),
          ...getComments(onToken),
          text("fragment "),
          ...node.name,
          ...(node.typeCondition ? [text(" on "), ...node.typeCondition] : []),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(node.selectionSet),
        ];
      },
    },
    FragmentSpread: {
      leave(node) {
        const spreadToken = (node.loc as Location)?.startToken;
        let nameToken = spreadToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;
        return [
          ...getComments(spreadToken),
          ...getComments(nameToken),
          text("..."),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    InlineFragment: {
      leave(node) {
        const spreadToken = (node.loc as Location)?.startToken;
        let onToken: Maybe<Token>;
        if (node.typeCondition) {
          onToken = spreadToken?.next;
          while (onToken && onToken.kind !== TokenKind.NAME)
            onToken = onToken.next;
        }
        return [
          ...getComments(spreadToken),
          ...getComments(onToken),
          text("..."),
          ...(node.typeCondition ? [text("on "), ...node.typeCondition] : []),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(node.selectionSet),
        ];
      },
    },
    InputObjectTypeDefinition: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lBraceToken: Maybe<Token>;
        if (node.fields) {
          lBraceToken = nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];
        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("input "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printInputValueDefinitionSet(
              node.fields,
              node.kind as unknown as Kind,
              lBraceToken,
              loc?.endToken
            )
          ),
        ];
      },
    },
    InputObjectTypeExtension: {
      leave(node) {
        const loc = node.loc as Location;

        const extendToken = loc?.startToken;

        let keywordToken = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let lBraceToken: Maybe<Token>;
        if (node.fields) {
          lBraceToken = nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend input "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printInputValueDefinitionSet(
              node.fields,
              node.kind as unknown as Kind,
              lBraceToken,
              loc?.endToken
            )
          ),
        ];
      },
    },
    InputValueDefinition: {
      leave(node) {
        let nameToken: Maybe<Token> = (node.loc as Location)?.startToken;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let colonToken = nameToken?.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;

        const comments = [
          ...getComments(nameToken),
          ...getComments(colonToken),
        ];

        return [
          ...printDescription(node.description, comments),
          ...comments,
          ...node.name,
          text(":"),
          SPACE,
          ...node.type,
          ...printDefaultValue(node.defaultValue, colonToken?.next),
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    InterfaceTypeDefinition: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        // TODO: this is a huge chunk of duplicated code (see ObjectTypeExtension, InterfaceTypeDefinition, InterfaceTypeExtension)
        let implementsToken: Maybe<Token>;
        let endToken: Maybe<Token>;
        if (!isEmpty(node.interfaces)) {
          implementsToken = nameToken?.next;
          while (implementsToken && implementsToken.kind !== TokenKind.NAME)
            implementsToken = implementsToken.next;

          endToken = implementsToken?.next;
          while (endToken && endToken.kind !== TokenKind.NAME)
            endToken = endToken.next;

          while (true) {
            let nextToken = endToken?.next;
            while (nextToken && nextToken.kind === TokenKind.COMMENT)
              nextToken = nextToken.next;

            if (nextToken?.kind !== TokenKind.AMP) break;

            nextToken = nextToken.next;
            while (nextToken && nextToken.kind !== TokenKind.NAME)
              nextToken = nextToken.next;
            endToken = nextToken;
          }
        }

        let lBraceToken: Maybe<Token>;
        if (!isEmpty(node.fields)) {
          lBraceToken = endToken?.next || nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];
        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("interface "),
          ...node.name,
          ...printNamedTypeSet(
            node.interfaces,
            node.kind as unknown as NamedTypeSetKinds,
            implementsToken,
            endToken
          ),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printFieldDefinitionSet(node.fields, lBraceToken, loc?.endToken)
          ),
        ];
      },
    },
    InterfaceTypeExtension: {
      leave(node) {
        const loc = node.loc as Location;

        const extendToken: Maybe<Token> = loc?.startToken;

        let keywordToken: Maybe<Token> = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let implementsToken: Maybe<Token>;
        let endToken: Maybe<Token>;
        if (!isEmpty(node.interfaces)) {
          implementsToken = nameToken?.next;
          while (implementsToken && implementsToken.kind !== TokenKind.NAME)
            implementsToken = implementsToken.next;

          endToken = implementsToken?.next;
          while (endToken && endToken.kind !== TokenKind.NAME)
            endToken = endToken.next;

          while (true) {
            let nextToken = endToken?.next;
            while (nextToken && nextToken.kind === TokenKind.COMMENT)
              nextToken = nextToken.next;

            if (nextToken?.kind !== TokenKind.AMP) break;

            nextToken = nextToken.next;
            while (nextToken && nextToken.kind !== TokenKind.NAME)
              nextToken = nextToken.next;
            endToken = nextToken;
          }
        }

        let lBraceToken: Maybe<Token>;
        if (!isEmpty(node.fields)) {
          lBraceToken = endToken?.next || nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend interface "),
          ...node.name,
          ...printNamedTypeSet(
            node.interfaces,
            node.kind as unknown as NamedTypeSetKinds,
            implementsToken,
            endToken
          ),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printFieldDefinitionSet(node.fields, lBraceToken, loc?.endToken)
          ),
        ];
      },
    },
    IntValue: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          text(node.value as unknown as string),
        ];
      },
    },
    ListType: {
      leave(node) {
        const loc = node.loc as Location;
        const start = getComments(loc?.startToken);
        const end = getComments(loc?.endToken);
        const { comments, rest } = filterComments(node.type);
        return [...start, ...comments, ...end, text("["), ...rest, text("]")];
      },
    },
    ListValue: {
      leave(node) {
        return printWrappedListWithComments(
          node.values,
          text("["),
          [],
          [text(","), SPACE],
          text("]"),
          (node.loc as Location)?.startToken,
          (node.loc as Location)?.endToken
        );
      },
    },
    Name: {
      leave(node) {
        return [text(node.value as unknown as string)];
      },
    },
    NamedType: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          ...node.name,
        ];
      },
    },
    NonNullType: {
      leave(node) {
        const { comments, rest } = filterComments(node.type);
        return [
          ...comments,
          ...getComments((node.loc as Location)?.endToken),
          ...rest,
          text("!"),
        ];
      },
    },
    NullValue: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          text("null"),
        ];
      },
    },
    ObjectField: {
      leave(node) {
        const nameToken = (node.loc as Location)?.startToken;
        let colonToken = nameToken?.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;
        return [
          ...getComments(nameToken),
          ...getComments(colonToken),
          ...node.name,
          text(":"),
          SPACE,
          ...node.value,
        ];
      },
    },
    ObjectTypeDefinition: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        // TODO: this is a huge chunk of duplicated code (see ObjectTypeExtension, InterfaceTypeDefinition, InterfaceTypeExtension)
        let implementsToken: Maybe<Token>;
        let endToken: Maybe<Token>;
        if (!isEmpty(node.interfaces)) {
          implementsToken = nameToken?.next;
          while (implementsToken && implementsToken.kind !== TokenKind.NAME)
            implementsToken = implementsToken.next;

          endToken = implementsToken?.next;
          while (endToken && endToken.kind !== TokenKind.NAME)
            endToken = endToken.next;

          while (true) {
            let nextToken = endToken?.next;
            while (nextToken && nextToken.kind === TokenKind.COMMENT)
              nextToken = nextToken.next;

            if (nextToken?.kind !== TokenKind.AMP) break;

            nextToken = nextToken.next;
            while (nextToken && nextToken.kind !== TokenKind.NAME)
              nextToken = nextToken.next;
            endToken = nextToken;
          }
        }

        let lBraceToken: Maybe<Token>;
        if (!isEmpty(node.fields)) {
          lBraceToken = endToken?.next || nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];
        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("type "),
          ...node.name,
          ...printNamedTypeSet(
            node.interfaces,
            node.kind as unknown as NamedTypeSetKinds,
            implementsToken,
            endToken
          ),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printFieldDefinitionSet(node.fields, lBraceToken, loc?.endToken)
          ),
        ];
      },
    },
    ObjectTypeExtension: {
      leave(node) {
        const loc = node.loc as Location;

        const extendToken: Maybe<Token> = loc?.startToken;

        let keywordToken: Maybe<Token> = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let implementsToken: Maybe<Token>;
        let endToken: Maybe<Token>;
        if (!isEmpty(node.interfaces)) {
          implementsToken = nameToken?.next;
          while (implementsToken && implementsToken.kind !== TokenKind.NAME)
            implementsToken = implementsToken.next;

          endToken = implementsToken?.next;
          while (endToken && endToken.kind !== TokenKind.NAME)
            endToken = endToken.next;

          while (true) {
            let nextToken = endToken?.next;
            while (nextToken && nextToken.kind === TokenKind.COMMENT)
              nextToken = nextToken.next;

            if (nextToken?.kind !== TokenKind.AMP) break;

            nextToken = nextToken.next;
            while (nextToken && nextToken.kind !== TokenKind.NAME)
              nextToken = nextToken.next;
            endToken = nextToken;
          }
        }

        let lBraceToken: Maybe<Token>;
        if (!isEmpty(node.fields)) {
          lBraceToken = endToken?.next || nameToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend type "),
          ...node.name,
          ...printNamedTypeSet(
            node.interfaces,
            node.kind as unknown as NamedTypeSetKinds,
            implementsToken,
            endToken
          ),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printFieldDefinitionSet(node.fields, lBraceToken, loc?.endToken)
          ),
        ];
      },
    },
    ObjectValue: {
      leave(node) {
        return printWrappedListWithComments(
          node.fields,
          text("{"),
          [SPACE],
          [text(","), SPACE],
          text("}"),
          (node.loc as Location)?.startToken,
          (node.loc as Location)?.endToken
        );
      },
    },
    OperationDefinition: {
      leave(node) {
        const keywordToken = (node.loc as Location)?.startToken;

        // Query shorthand
        if (keywordToken?.kind === TokenKind.BRACE_L) return node.selectionSet;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        const hasVariables = !isEmpty(node.variableDefinitions);
        let lParenToken: Maybe<Token>;
        let rParenToken: Maybe<Token>;
        if (hasVariables) {
          lParenToken = nameToken?.next;
          while (lParenToken && lParenToken.kind !== TokenKind.PAREN_L)
            lParenToken = lParenToken.next;

          rParenToken = lParenToken?.next;
          while (rParenToken && rParenToken.kind !== TokenKind.PAREN_R)
            rParenToken = rParenToken.next;
        }

        return [
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text(node.operation as unknown as OperationTypeNode),
          ...(node.name ? [text(" "), ...node.name] : []),
          ...(hasVariables
            ? printWrappedListWithComments(
                node.variableDefinitions,
                text("("),
                [],
                [text(","), SPACE],
                text(")"),
                lParenToken,
                rParenToken
              )
            : []),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(node.selectionSet),
        ];
      },
    },
    OperationTypeDefinition: {
      leave(node) {
        const operationTypeToken = (node.loc as Location)?.startToken;
        let colonToken = operationTypeToken?.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;
        return [
          ...getComments(operationTypeToken),
          ...getComments(colonToken),
          text(node.operation as unknown as OperationTypeNode),
          text(":"),
          SPACE,
          ...node.type,
        ];
      },
    },
    ScalarTypeDefinition: {
      leave(node) {
        let keywordToken: Maybe<Token> = (node.loc as Location)?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];

        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("scalar "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    ScalarTypeExtension: {
      leave(node) {
        const extendToken = (node.loc as Location)?.startToken;

        let keywordToken = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend scalar "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
    SchemaDefinition: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;
        const comments = getComments(keywordToken);

        let lBraceToken = keywordToken?.next;
        while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
          lBraceToken = lBraceToken.next;

        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("schema"),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printOperationTypeDefinitionSet(
              node.operationTypes,
              lBraceToken,
              loc?.endToken
            )
          ),
        ];
      },
    },
    SchemaExtension: {
      leave(node) {
        const loc = node.loc as Location;

        let keywordToken = loc?.startToken.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let lBraceToken: Maybe<Token>;
        if (!isEmpty(node.operationTypes)) {
          lBraceToken = keywordToken?.next;
          while (lBraceToken && lBraceToken.kind !== TokenKind.BRACE_L)
            lBraceToken = lBraceToken.next;
        }

        return [
          ...getComments(loc?.startToken),
          ...getComments(keywordToken),
          text("extend schema"),
          ...withSpace(join(node.directives || [], [SPACE])),
          ...withSpace(
            printOperationTypeDefinitionSet(
              node.operationTypes,
              lBraceToken,
              loc?.endToken
            )
          ),
        ];
      },
    },
    SelectionSet: {
      leave(node) {
        return printWrappedListWithComments(
          node.selections,
          text("{"),
          [],
          [text(",")],
          text("}"),
          (node.loc as Location)?.startToken,
          (node.loc as Location)?.endToken,
          true
        );
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

        const loc = node.loc as Location;
        const token = loc?.startToken;

        const comments: Comment[] = [];
        if (preserveComments && loc && token) {
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
              ? loc.source.body.slice(0, token.end).split("\n").length
              : token.line;
          if (
            token.next?.kind === TokenKind.COMMENT &&
            token.next.line === line
          )
            comments.push({ type: "inline_comment", token: token.next });
        }

        return [
          ...comments,
          ...(node.block
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
        ];
      },
    },
    UnionTypeDefinition: {
      leave(node) {
        let loc = node.loc as Location;

        let keywordToken: Maybe<Token> = loc?.startToken;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let equalsToken: Maybe<Token>;
        if (!isEmpty(node.types)) {
          equalsToken = nameToken?.next;
          while (equalsToken && equalsToken.kind !== TokenKind.EQUALS)
            equalsToken = equalsToken.next;
        }

        const comments = [
          ...getComments(keywordToken),
          ...getComments(nameToken),
        ];
        return [
          ...printDescription(node.description, comments),
          ...comments,
          text("union "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...printNamedTypeSet(
            node.types,
            node.kind as unknown as NamedTypeSetKinds,
            equalsToken,
            loc?.endToken
          ),
        ];
      },
    },
    UnionTypeExtension: {
      leave(node) {
        const loc = node.loc as Location;

        const extendToken = loc?.startToken;

        let keywordToken: Maybe<Token> = extendToken?.next;
        while (keywordToken && keywordToken.kind !== TokenKind.NAME)
          keywordToken = keywordToken.next;

        let nameToken = keywordToken?.next;
        while (nameToken && nameToken.kind !== TokenKind.NAME)
          nameToken = nameToken.next;

        let equalsToken: Maybe<Token>;
        if (!isEmpty(node.types)) {
          equalsToken = nameToken?.next;
          while (equalsToken && equalsToken.kind !== TokenKind.EQUALS)
            equalsToken = equalsToken.next;
        }

        return [
          ...getComments(extendToken),
          ...getComments(keywordToken),
          ...getComments(nameToken),
          text("extend union "),
          ...node.name,
          ...withSpace(join(node.directives || [], [SPACE])),
          ...printNamedTypeSet(
            node.types,
            node.kind as unknown as NamedTypeSetKinds,
            equalsToken,
            loc?.endToken
          ),
        ];
      },
    },
    Variable: {
      leave(node) {
        return [
          ...getComments((node.loc as Location)?.startToken),
          ...getComments((node.loc as Location)?.endToken),
          text("$"),
          ...node.name,
        ];
      },
    },
    VariableDefinition: {
      leave(node) {
        let colonToken = (node.loc as Location)?.startToken.next;
        while (colonToken && colonToken.kind !== TokenKind.COLON)
          colonToken = colonToken.next;

        const { comments, rest } = filterComments(node.variable);

        return [
          ...comments,
          ...getComments(colonToken),
          ...rest,
          text(":"),
          SPACE,
          ...node.type,
          ...printDefaultValue(node.defaultValue, colonToken?.next),
          ...withSpace(join(node.directives || [], [SPACE])),
        ];
      },
    },
  });

  const resolveComments = list.reduce<(Text | SoftLine | HardLine)[]>(
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
              ...join<Text, HardLine>(
                item.token.value
                  .trim()
                  .split("\n")
                  .map((line) => [text("#"), SPACE, text(line)]),
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
            handleIndentation(item.indentation);
            printed += "\n" + indentation;
            for (const prefix of item.prefix) printed += prefix.value;
          } else {
            for (const alt of item.alt) printed += alt.value;
          }
          break;
      }
    }
    return printed;
  }

  function printCurrentLine() {
    const printedLine = indentation + printLine(currentLine, false);
    if (!pretty || printedLine.length <= maxLineLength) {
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
  // TODO: also return whitespace at the end of lines
  return printed.replace(/^\n*/, "").replace(/\n*$/, pretty ? "\n" : "");
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

function isEmpty<T>(list: Maybe<readonly T[]>): list is null | undefined {
  return !list || list.length === 0;
}

function join<T extends PrintToken, S extends PrintToken>(
  list: readonly T[] | readonly T[][],
  delimiter: S[]
) {
  const joined: (S | T)[] = [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0) joined.push(...delimiter);
    const item = list[i];
    joined.push(...(Array.isArray(item) ? item : [item]));
  }
  return joined;
}

function hasHardLine(list: readonly PrintToken[][]) {
  for (let i = 0; i < list.length; i++)
    for (let j = 0; j < list[i].length; j++) {
      const item = list[i][j];
      if (
        item.type === "hard_line" ||
        item.type === "block_comment" ||
        item.type === "inline_comment"
      )
        return true;
    }
  return false;
}
