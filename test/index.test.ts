import { readFileSync } from "fs";
import {
  BooleanValueNode,
  DirectiveDefinitionNode,
  EnumTypeDefinitionNode,
  EnumTypeExtensionNode,
  EnumValueNode,
  FieldNode,
  FloatValueNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  IntValueNode,
  ListTypeNode,
  ListValueNode,
  NamedTypeNode,
  NonNullTypeNode,
  NullValueNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  ObjectValueNode,
  OperationDefinitionNode,
  parse,
  ScalarTypeDefinitionNode,
  ScalarTypeExtensionNode,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  StringValueNode,
  UnionTypeDefinitionNode,
  UnionTypeExtensionNode,
  VariableNode,
} from "graphql";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { print } from "../src";

const KITCHEN_SINK = readFileSync(
  join(__dirname, "utils", "kitchenSink.gql"),
  "utf8"
);

describe("kitchen sink", () => {
  describe("standard printing", () => {
    it("prints without comments", () => {
      expect(print(parse(KITCHEN_SINK))).toMatchInlineSnapshot(`
        "query queryName($foo:ComplexType,$site:Site=MOBILE)@onQuery{whoever123is:node(id:[123,456]){id,...on User@onInlineFragment{field2{id,alias:field1(first:10,after:$foo)@include(if:$foo){id,...frag@onFragmentSpread}}},...@skip(unless:$foo){id},...{id}}}
        mutation likeStory@onMutation{like(story:123)@onField{story{id@onField}}}
        subscription StoryLikeSubscription($input:StoryLikeSubscribeInput@onVariableDefinition)@onSubscription{storyLikeSubscribe(input:$input){story{likers{count},likeSentence{text}}}}
        fragment frag on Friend@onFragmentDefinition{foo(size:$size,bar:$b,obj:{key:\\"value\\",block:\\"\\"\\"block string uses \\\\\\"\\"\\"\\"\\"\\"})}
        {unnamed(truthy:true,falsy:false,nullish:null),query}
        query{__typename}"
      `);
    });
    it("prints with comments", () => {
      expect(print(parse(KITCHEN_SINK), { preserveComments: true }))
        .toMatchInlineSnapshot(`
          "query queryName($foo:ComplexType,$site:Site=MOBILE)@onQuery{whoever123is:node(id:[123,456]){
          #field block comment
          id,...on User@onInlineFragment{field2{
          #field inline comment
          id,alias:field1(first:10,after:$foo)@include(if:$foo){id,...frag@onFragmentSpread}}},...@skip(unless:$foo){id},...{id}}}
          #block comment
          #with multiple lines
          #this is a new comment
          mutation likeStory@onMutation{like(story:123)@onField{story{id@onField}}}
          subscription StoryLikeSubscription($input:StoryLikeSubscribeInput@onVariableDefinition)@onSubscription{storyLikeSubscribe(input:$input){story{likers{count},likeSentence{text}}}}
          fragment frag on Friend@onFragmentDefinition{foo(size:$size,bar:$b,obj:{key:\\"value\\",block:\\"\\"\\"block string uses \\\\\\"\\"\\"\\"\\"\\"})}
          {unnamed(truthy:true,falsy:false,nullish:null),query}
          query{__typename}"
        `);
    });
  });
  describe("pretty printing", () => {
    it("prints without comments", () => {
      expect(print(parse(KITCHEN_SINK), { pretty: true }))
        .toMatchInlineSnapshot(`
        "query queryName($foo: ComplexType, $site: Site = MOBILE) @onQuery {
          whoever123is: node(id: [123, 456]) {
            id
            ...on User @onInlineFragment {
              field2 {
                id
                alias: field1(first: 10, after: $foo) @include(if: $foo) {
                  id
                  ...frag @onFragmentSpread
                }
              }
            }
            ... @skip(unless: $foo) {
              id
            }
            ... {
              id
            }
          }
        }

        mutation likeStory @onMutation {
          like(story: 123) @onField {
            story {
              id @onField
            }
          }
        }

        subscription StoryLikeSubscription(
          $input: StoryLikeSubscribeInput @onVariableDefinition
        ) @onSubscription {
          storyLikeSubscribe(input: $input) {
            story {
              likers {
                count
              }
              likeSentence {
                text
              }
            }
          }
        }

        fragment frag on Friend @onFragmentDefinition {
          foo(
            size: $size
            bar: $b
            obj: {
              key: \\"value\\"
              block: \\"\\"\\"block string uses \\\\\\"\\"\\"\\"\\"\\"
            }
          )
        }

        {
          unnamed(truthy: true, falsy: false, nullish: null)
          query
        }

        query {
          __typename
        }
        "
      `);
    });
    it("prints with comments", () => {
      expect(
        print(parse(KITCHEN_SINK), { preserveComments: true, pretty: true })
      ).toMatchInlineSnapshot(`
        "query queryName($foo: ComplexType, $site: Site = MOBILE) @onQuery {
          whoever123is: node(id: [123, 456]) {
            # field block comment
            id
            ...on User @onInlineFragment {
              field2 {
                # field inline comment
                id
                alias: field1(first: 10, after: $foo) @include(if: $foo) {
                  id
                  ...frag @onFragmentSpread
                }
              }
            }
            ... @skip(unless: $foo) {
              id
            }
            ... {
              id
            }
          }
        }

        # block comment
        # with multiple lines
        # this is a new comment
        mutation likeStory @onMutation {
          like(story: 123) @onField {
            story {
              id @onField
            }
          }
        }

        subscription StoryLikeSubscription(
          $input: StoryLikeSubscribeInput @onVariableDefinition
        ) @onSubscription {
          storyLikeSubscribe(input: $input) {
            story {
              likers {
                count
              }
              likeSentence {
                text
              }
            }
          }
        }

        fragment frag on Friend @onFragmentDefinition {
          foo(
            size: $size
            bar: $b
            obj: {
              key: \\"value\\"
              block: \\"\\"\\"block string uses \\\\\\"\\"\\"\\"\\"\\"
            }
          )
        }

        {
          unnamed(truthy: true, falsy: false, nullish: null)
          query
        }

        query {
          __typename
        }
        "
      `);
    });
  });
});

const LANGUAGE = readFileSync(join(__dirname, "utils", "language.gql"), "utf8");

describe("idempotency for parsing-printing", () => {
  it("is idempotent without comments", () => {
    const language = print(parse(LANGUAGE));
    expect(print(parse(language))).toBe(language);
  });
  it("is idempotent with comments", () => {
    const language = print(parse(LANGUAGE), { preserveComments: true });
    expect(print(parse(language), { preserveComments: true })).toBe(language);
  });
});

const COMMENTS = readFileSync(join(__dirname, "utils", "comments.gql"), "utf8");

describe("preserving comments", () => {
  it("does not remove any comments when standard printing", () => {
    const printed = print(parse(COMMENTS), { preserveComments: true });
    for (let i = 1; i <= 46; i++)
      expect(printed).toMatch(new RegExp("#comment " + i + "(\\n|#|$)"));
  });
  it("does not remove any comments when pretty printing", () => {
    const printed = print(parse(COMMENTS), {
      preserveComments: true,
      pretty: true,
    });
    for (let i = 1; i <= 46; i++)
      expect(printed).toMatch(new RegExp("# comment " + i + "(\\n| |$)"));
  });
});

describe("Argument", () => {
  const q = `
    {
      myField(
        # block comment 1
        myArg # inline comment 1
        # block comment 2
        : # inline comment 2
        "my string"
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"myArg:\\"my string\\""');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      myArg:\\"my string\\""
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "myArg: \\"my string\\"
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        myArg: \\"my string\\"
        "
      `);
  });
});

describe("BooleanValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment
        true # inline comment
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as BooleanValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"true"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      true"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "true
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      true
      "
    `);
  });
});

describe("Directive", () => {
  describe("inline arguments", () => {
    const q = `
      query
      # block comment 1
      @ # inline comment 1
      # block comment 2
      myDirective # inline comment 2
      # block comment 3
      ( # inline comment 3
        myArg: "my string"
      # block comment 4
      ) # inline comment 4
      {
        myField
      }
    `;
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .directives![0];
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"@myDirective(myArg:\\"my string\\")"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        @myDirective
        #block comment 3
        #inline comment 3
        (myArg:\\"my string\\"
        #block comment 4
        #inline comment 4
        )"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "@myDirective(myArg: \\"my string\\")
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          @myDirective
          # block comment 3
          # inline comment 3
          (
            myArg: \\"my string\\"
          # block comment 4
          # inline comment 4
          )
          "
        `);
    });
  });
  describe("multiline arguments", () => {
    const q = `
      query @myDirective(myArg1: "my very very long string", myArg2: "my very very long string") {
        myField
      }
    `;
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .directives![0];
    it("prints ", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"@myDirective(myArg1:\\"my very very long string\\",myArg2:\\"my very very long string\\")"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "@myDirective(
          myArg1: \\"my very very long string\\"
          myArg2: \\"my very very long string\\"
        )
        "
      `);
    });
  });
});

describe("DirectiveDefinition", () => {
  describe("with comments", () => {
    const q = `
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      directive # inline comment 2
      # block comment 3
      @ # inline comment 3
      # block comment 4
      myDirective # inline comment 4
      # block comment 5
      ( # inline comment 5
        myArg: Int = 42
      # block comment 6
      ) # inline comment 6
      # block comment 7
      repeatable # inline comment 7
      # block comment 8
      on # inline comment 8
      # block comment 9
      | # inline comment 9
      # block comment 10
      QUERY # inline comment 10
      # block comment 11
      | # inline comment 11
      # block comment 12
      MUTATION # inline comment 12
    `;
    const node = parse(q).definitions[0] as DirectiveDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"\\"my description\\"directive@myDirective(myArg:Int=42) repeatable on QUERY|MUTATION"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        \\"my description\\"
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        #block comment 4
        #inline comment 4
        directive@myDirective
        #block comment 5
        #inline comment 5
        (myArg:Int=42
        #block comment 6
        #inline comment 6
        )
        #block comment 7
        #inline comment 7
        repeatable 
        #block comment 8
        #inline comment 8
        on
        #block comment 9
        #inline comment 9
        #block comment 10
        #inline comment 10
        QUERY
        #block comment 11
        #inline comment 11
        #block comment 12
        #inline comment 12
        |MUTATION"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"my description\\"
        directive @myDirective(myArg: Int = 42) repeatable on QUERY | MUTATION
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          \\"my description\\"
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          # block comment 4
          # inline comment 4
          directive @myDirective
          # block comment 5
          # inline comment 5
          (
            myArg: Int = 42
          # block comment 6
          # inline comment 6
          )
          # block comment 7
          # inline comment 7
          repeatable 
          # block comment 8
          # inline comment 8
          on
          # block comment 9
          # inline comment 9
          # block comment 10
          # inline comment 10
          | QUERY
          # block comment 11
          # inline comment 11
          # block comment 12
          # inline comment 12
          | MUTATION
          "
        `);
    });
  });
  describe("inline", () => {
    const q = `
      directive @myDirective 
      # block comment
      on # inline comment
      QUERY | MUTATION
    `;
    const node = parse(q).definitions[0] as DirectiveDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"directive@myDirective on QUERY|MUTATION"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "directive@myDirective 
        #block comment
        #inline comment
        on QUERY|MUTATION"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "directive @myDirective on QUERY | MUTATION
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "directive @myDirective 
          # block comment
          # inline comment
          on QUERY | MUTATION
          "
        `);
    });
  });
  describe("multiline", () => {
    const q = `
      directive @myDirective
      # block comment
      on # inline comment
      | QUERY
      | MUTATION
      | SUBSCRIPTION
      | FIELD
      | FRAGMENT_DEFINITION
      | FRAGMENT_SPREAD
      | INLINE_FRAGMENT
      | VARIABLE_DEFINITION
    `;
    const node = parse(q).definitions[0] as DirectiveDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"directive@myDirective on QUERY|MUTATION|SUBSCRIPTION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|VARIABLE_DEFINITION"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "directive@myDirective 
        #block comment
        #inline comment
        on QUERY|MUTATION|SUBSCRIPTION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|VARIABLE_DEFINITION"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "directive @myDirective on
        | QUERY
        | MUTATION
        | SUBSCRIPTION
        | FIELD
        | FRAGMENT_DEFINITION
        | FRAGMENT_SPREAD
        | INLINE_FRAGMENT
        | VARIABLE_DEFINITION
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "directive @myDirective 
          # block comment
          # inline comment
          on
          | QUERY
          | MUTATION
          | SUBSCRIPTION
          | FIELD
          | FRAGMENT_DEFINITION
          | FRAGMENT_SPREAD
          | INLINE_FRAGMENT
          | VARIABLE_DEFINITION
          "
        `);
    });
  });
});

describe("Document", () => {
  const q = `
    type MyObjectType {
      field: Int
    }
    # block comment
    # inline comment
  `;
  const node = parse(q);
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"type MyObjectType{field:Int}"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "type MyObjectType{field:Int}
      #block comment
      #inline comment"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "type MyObjectType {
        field: Int
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "type MyObjectType {
          field: Int
        }

        # block comment
        # inline comment
        "
      `);
  });
});

describe("EnumTypeDefinition", () => {
  const q = `
    # block comment 1
    "my description" # inline comment 1
    # block comment 2
    enum # inline comment 2
    # block comment 3
    MyEnumType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
    # block comment 6
    { # inline comment 6
      MY_ENUM_VALUE
      MY_OTHER_ENUM_VALUE
    # block comment 7
    } # inline comment 7
  `;
  const node = parse(q).definitions[0] as EnumTypeDefinitionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"enum MyEnumType@myDirective@myOtherDirective{MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      enum MyEnumType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective
      #block comment 6
      #inline comment 6
      {MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE
      #block comment 7
      #inline comment 7
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      enum MyEnumType @myDirective @myOtherDirective {
        MY_ENUM_VALUE
        MY_OTHER_ENUM_VALUE
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        enum MyEnumType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective 
        # block comment 6
        # inline comment 6
        {
          MY_ENUM_VALUE
          MY_OTHER_ENUM_VALUE
        # block comment 7
        # inline comment 7
        }
        "
      `);
  });
});

describe("EnumTypeExtension", () => {
  const q = `
    # block comment 1
    extend # inline comment 1
    # block comment 2
    enum # inline comment 2
    # block comment 3
    MyEnumType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
    # block comment 6
    { # inline comment 6
      MY_ENUM_VALUE
      MY_OTHER_ENUM_VALUE
    # block comment 7
    } # inline comment 7
  `;
  const node = parse(q).definitions[0] as EnumTypeExtensionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"extend enum MyEnumType@myDirective@myOtherDirective{MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      extend enum MyEnumType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective
      #block comment 6
      #inline comment 6
      {MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE
      #block comment 7
      #inline comment 7
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "extend enum MyEnumType @myDirective @myOtherDirective {
        MY_ENUM_VALUE
        MY_OTHER_ENUM_VALUE
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        extend enum MyEnumType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective 
        # block comment 6
        # inline comment 6
        {
          MY_ENUM_VALUE
          MY_OTHER_ENUM_VALUE
        # block comment 7
        # inline comment 7
        }
        "
      `);
  });
});

describe("EnumValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment
        MY_ENUM_VALUE # inline comment
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as EnumValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"MY_ENUM_VALUE"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      MY_ENUM_VALUE"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "MY_ENUM_VALUE
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        MY_ENUM_VALUE
        "
      `);
  });
});

describe("EnumValueDefinitionNode", () => {
  const q = `
    enum MyEnumType {
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      MY_ENUM_VALUE # inline comment 2
      # block comment 3
      @myDirective # inline comment 3
      # block comment 4
      @myOtherDirective # inline comment 4
    }
  `;
  const node = (parse(q).definitions[0] as EnumTypeDefinitionNode).values![0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"MY_ENUM_VALUE@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      MY_ENUM_VALUE
      #block comment 3
      #inline comment 3
      @myDirective
      #block comment 4
      #inline comment 4
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      MY_ENUM_VALUE @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        MY_ENUM_VALUE 
        # block comment 3
        # inline comment 3
        @myDirective 
        # block comment 4
        # inline comment 4
        @myOtherDirective
        "
      `);
  });
});

describe("Field", () => {
  describe("inline arguments", () => {
    const q = `
      {
        # block comment 1
        myAlias # inline comment 1
        # block comment 2
        : # inline comment 2
        # block comment 3
        myField # inline comment 3
        # block comment 4
        ( # inline comment 4
          myArg: 42
        # block comment 5
        ) # inline comment 5
        # block comment 6
        @myDirective # inline comment 6
        # block comment 7
        @myOtherDirective # inline comment 7
        {
          mySubField
        }
      }
    `;
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .selectionSet.selections[0] as FieldNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"myAlias:myField(myArg:42)@myDirective@myOtherDirective{mySubField}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        myAlias:myField
        #block comment 4
        #inline comment 4
        (myArg:42
        #block comment 5
        #inline comment 5
        )
        #block comment 6
        #inline comment 6
        @myDirective
        #block comment 7
        #inline comment 7
        @myOtherDirective{mySubField}"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "myAlias: myField(myArg: 42) @myDirective @myOtherDirective {
          mySubField
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          myAlias: myField
          # block comment 4
          # inline comment 4
          (
            myArg: 42
          # block comment 5
          # inline comment 5
          ) 
          # block comment 6
          # inline comment 6
          @myDirective 
          # block comment 7
          # inline comment 7
          @myOtherDirective {
            mySubField
          }
          "
        `);
    });
  });
  describe("multiline arguments", () => {
    const q = `
      {
        myField(myArg1: "my very very long string", myArg2: "my very very long string") {
          mySubField
        }
      }
    `;
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .selectionSet.selections[0] as FieldNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"myField(myArg1:\\"my very very long string\\",myArg2:\\"my very very long string\\"){mySubField}"'
      );
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "myField(
          myArg1: \\"my very very long string\\"
          myArg2: \\"my very very long string\\"
        ) {
          mySubField
        }
        "
      `);
    });
  });
});

describe("FieldDefinition", () => {
  const q = `
    type MyType {
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      myField # inline comment 2
      # block comment 3
      ( # inline comment 3
        myArg: MyInputType = 42
      # block comment 4
      ) # inline comment 4
      # block comment 5
      : # inline comment 5
      # block comment 6
      MyOutputType # inline comment 6
      # block comment 7
      @myDirective # inline comment 7
      # block comment 8
      @myOtherDirective # inline comment 8
    }
  `;
  const node = (parse(q).definitions[0] as ObjectTypeDefinitionNode).fields![0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"myField(myArg:MyInputType=42):MyOutputType@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      #block comment 5
      #inline comment 5
      myField
      #block comment 3
      #inline comment 3
      (myArg:MyInputType=42
      #block comment 4
      #inline comment 4
      ):
      #block comment 6
      #inline comment 6
      MyOutputType
      #block comment 7
      #inline comment 7
      @myDirective
      #block comment 8
      #inline comment 8
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      myField(myArg: MyInputType = 42): MyOutputType @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        # block comment 5
        # inline comment 5
        myField
        # block comment 3
        # inline comment 3
        (
          myArg: MyInputType = 42
        # block comment 4
        # inline comment 4
        ): 
        # block comment 6
        # inline comment 6
        MyOutputType 
        # block comment 7
        # inline comment 7
        @myDirective 
        # block comment 8
        # inline comment 8
        @myOtherDirective
        "
      `);
  });
});

describe("FloatValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment
        42.43e44 # inline comment
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as FloatValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"42.43e44"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      42.43e44"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "42.43e44
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        42.43e44
        "
      `);
  });
});

describe("FragmentDefinition", () => {
  const q = `
    # block comment 1
    fragment # inline comment 1
    # block comment 2
    MyFragmentName # inline comment 2
    # block comment 3
    on # inline comment 3
    # block comment 4
    MyType # inline comment 4
    # block comment 5
    @myDirective # inline comment 5
    # block comment 6
    @myOtherDirective # inline comment 6
    {
      myField
    }
  `;
  const node = parse(q).definitions[0] as FragmentDefinitionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"fragment MyFragmentName on MyType@myDirective@myOtherDirective{myField}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      fragment MyFragmentName on 
      #block comment 4
      #inline comment 4
      MyType
      #block comment 5
      #inline comment 5
      @myDirective
      #block comment 6
      #inline comment 6
      @myOtherDirective{myField}"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "fragment MyFragmentName on MyType @myDirective @myOtherDirective {
        myField
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        fragment MyFragmentName on 
        # block comment 4
        # inline comment 4
        MyType 
        # block comment 5
        # inline comment 5
        @myDirective 
        # block comment 6
        # inline comment 6
        @myOtherDirective {
          myField
        }
        "
      `);
  });
});

describe("FragmentSpread", () => {
  const q = `
    {
      # block comment 1
      ... # inline comment 1
      # block comment 2
      MyFragmentName # inline comment 2
      # block comment 3
      @myDirective # inline comment 3
      # block comment 4
      @myOtherDirective # inline comment 4
    }
  `;
  const node = (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
    .selections[0] as FragmentSpreadNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"...MyFragmentName@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      ...MyFragmentName
      #block comment 3
      #inline comment 3
      @myDirective
      #block comment 4
      #inline comment 4
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "...MyFragmentName @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        ...MyFragmentName 
        # block comment 3
        # inline comment 3
        @myDirective 
        # block comment 4
        # inline comment 4
        @myOtherDirective
        "
      `);
  });
});

describe("InlineFragment", () => {
  const q = `
    {
      # block comment 1
      ... # inline comment 1
      # block comment 2
      on # inline comment 2
      # block comment 3
      MyType # inline comment 3
      # block comment 4
      @myDirective # inline comment 4
      # block comment 5
      @myOtherDirective # inline comment 5
      {
        myField
      }
    }
  `;
  const node = (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
    .selections[0] as InlineFragmentNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"...on MyType@myDirective@myOtherDirective{myField}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      ...on 
      #block comment 3
      #inline comment 3
      MyType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective{myField}"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "...on MyType @myDirective @myOtherDirective {
        myField
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        ...on 
        # block comment 3
        # inline comment 3
        MyType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective {
          myField
        }
        "
      `);
  });
});

describe("InputObjectTypeDefinition", () => {
  const q = `
    # block comment 1
    "my description" # inline comment 1
    # block comment 2
    input # inline comment 2
    # block comment 3
    MyInputObjectType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
    # block comment 6
    { # inline comment 6
      myField: MyInputType
    # block comment 7
    } # inline comment 7
  `;
  const node = parse(q).definitions[0] as InputObjectTypeDefinitionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"input MyInputObjectType@myDirective@myOtherDirective{myField:MyInputType}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      input MyInputObjectType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective
      #block comment 6
      #inline comment 6
      {myField:MyInputType
      #block comment 7
      #inline comment 7
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      input MyInputObjectType @myDirective @myOtherDirective {
        myField: MyInputType
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        input MyInputObjectType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective 
        # block comment 6
        # inline comment 6
        {
          myField: MyInputType
        # block comment 7
        # inline comment 7
        }
        "
      `);
  });
});

describe("InputObjectTypeExtension", () => {
  const q = `
    # block comment 1
    extend # inline comment 1
    # block comment 2
    input # inline comment 2
    # block comment 3
    MyInputObjectType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
    # block comment 6
    { # inline comment 6
      myField: MyInputType
    # block comment 7
    } # inline comment 7
  `;
  const node = parse(q).definitions[0] as InputObjectTypeExtensionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"extend input MyInputObjectType@myDirective@myOtherDirective{myField:MyInputType}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      extend input MyInputObjectType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective
      #block comment 6
      #inline comment 6
      {myField:MyInputType
      #block comment 7
      #inline comment 7
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "extend input MyInputObjectType @myDirective @myOtherDirective {
        myField: MyInputType
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        extend input MyInputObjectType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective 
        # block comment 6
        # inline comment 6
        {
          myField: MyInputType
        # block comment 7
        # inline comment 7
        }
        "
      `);
  });
});

describe("InputValueDefinition", () => {
  const q = `
    type MyType {
      myField(
        # block comment 1
        "my description" # inline comment 1
        # block comment 2
        myInputField # inline comment 2
        # block comment 3
        : # inline comment 3
        # block comment 4
        MyInputType # inline comment 4
        # block comment 5
        = # inline comment 5
        # block comment 6
        42 # inline comment 6
        # block comment 7
        @myDirective # inline comment 7
        # block comment 8
        @myOtherDirective # inline comment 8
      ): MyType
    }
  `;
  const node = (parse(q).definitions[0] as ObjectTypeDefinitionNode).fields![0]
    .arguments![0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"myInputField:MyInputType=42@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      myInputField:
      #block comment 4
      #inline comment 4
      MyInputType
      #block comment 5
      #inline comment 5
      #block comment 6
      #inline comment 6
      =42
      #block comment 7
      #inline comment 7
      @myDirective
      #block comment 8
      #inline comment 8
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      myInputField: MyInputType = 42 @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        myInputField: 
        # block comment 4
        # inline comment 4
        MyInputType
        # block comment 5
        # inline comment 5
        # block comment 6
        # inline comment 6
        = 42 
        # block comment 7
        # inline comment 7
        @myDirective 
        # block comment 8
        # inline comment 8
        @myOtherDirective
        "
      `);
  });
});

describe("InterfaceTypeDefinition", () => {
  describe("inline interfaces", () => {
    const q = `
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      interface # inline comment 2
      # block comment 3
      MyInterfaceType # inline comment 3
      # block comment 4
      implements # inline comment 4
      # block comment 5
      & # inline comment 5
      # block comment 6
      MyInterfaceType1 # inline comment 6
      # block comment 7
      & # inline comment 7
      # block comment 8
      MyInterfaceType2 # inline comment 8
      # block comment 9
      @myDirective # inline comment 9
      # block comment 10
      @myOtherDirective # inline comment 10
      # block comment 11
      { # inline comment 11
        myField: MyOutputType
      # block comment 12
      } # inline comment 12
    `;
    const node = parse(q).definitions[0] as InterfaceTypeDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"\\"my description\\"interface MyInterfaceType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        \\"my description\\"
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        interface MyInterfaceType
        #block comment 4
        #inline comment 4
        implements
        #block comment 5
        #inline comment 5
        #block comment 6
        #inline comment 6
        MyInterfaceType1
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        &MyInterfaceType2
        #block comment 9
        #inline comment 9
        @myDirective
        #block comment 10
        #inline comment 10
        @myOtherDirective
        #block comment 11
        #inline comment 11
        {myField:MyOutputType
        #block comment 12
        #inline comment 12
        }"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"my description\\"
        interface MyInterfaceType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          \\"my description\\"
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          interface MyInterfaceType
          # block comment 4
          # inline comment 4
          implements
          # block comment 5
          # inline comment 5
          # block comment 6
          # inline comment 6
          & MyInterfaceType1
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          & MyInterfaceType2 
          # block comment 9
          # inline comment 9
          @myDirective 
          # block comment 10
          # inline comment 10
          @myOtherDirective 
          # block comment 11
          # inline comment 11
          {
            myField: MyOutputType
          # block comment 12
          # inline comment 12
          }
          "
        `);
    });
  });
  describe("multiline interfaces", () => {
    const q = `
      interface MyInterfaceType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
    const node = parse(q).definitions[0] as InterfaceTypeDefinitionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"interface MyInterfaceType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "interface MyInterfaceType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
    });
  });
});

describe("InterfaceTypeExtension", () => {
  describe("inline interfaces", () => {
    const q = `
      # block comment 1
      extend # inline comment 1
      # block comment 2
      interface # inline comment 2
      # block comment 3
      MyInterfaceType # inline comment 3
      # block comment 4
      implements # inline comment 4
      # block comment 5
      & # inline comment 5
      # block comment 6
      MyInterfaceType1 # inline comment 6
      # block comment 7
      & # inline comment 7
      # block comment 8
      MyInterfaceType2 # inline comment 8
      # block comment 9
      @myDirective # inline comment 9
      # block comment 10
      @myOtherDirective # inline comment 10
      # block comment 11
      { # inline comment 11
        myField: MyOutputType
      # block comment 12
      } # inline comment 12
    `;
    const node = parse(q).definitions[0] as InterfaceTypeExtensionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"extend interface MyInterfaceType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        extend interface MyInterfaceType
        #block comment 4
        #inline comment 4
        implements
        #block comment 5
        #inline comment 5
        #block comment 6
        #inline comment 6
        MyInterfaceType1
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        &MyInterfaceType2
        #block comment 9
        #inline comment 9
        @myDirective
        #block comment 10
        #inline comment 10
        @myOtherDirective
        #block comment 11
        #inline comment 11
        {myField:MyOutputType
        #block comment 12
        #inline comment 12
        }"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          extend interface MyInterfaceType
          # block comment 4
          # inline comment 4
          implements
          # block comment 5
          # inline comment 5
          # block comment 6
          # inline comment 6
          & MyInterfaceType1
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          & MyInterfaceType2 
          # block comment 9
          # inline comment 9
          @myDirective 
          # block comment 10
          # inline comment 10
          @myOtherDirective 
          # block comment 11
          # inline comment 11
          {
            myField: MyOutputType
          # block comment 12
          # inline comment 12
          }
          "
        `);
    });
  });
  describe("multiline interfaces", () => {
    const q = `
      extend interface MyInterfaceType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
    const node = parse(q).definitions[0] as InterfaceTypeExtensionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"extend interface MyInterfaceType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
    });
  });
});

describe("IntValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment
        42 # inline comment
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as IntValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"42"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      42"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "42
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        42
        "
      `);
  });
});

describe("ListType", () => {
  const q = `
    type MyType {
      myField: 
      # block comment 1
      [ # inline comment 1
      # block comment 2
      MyType # inline comment 2
      # block comment 3
      ] # inline comment 3
    }
  `;
  const node = (parse(q).definitions[0] as ObjectTypeDefinitionNode).fields![0]
    .type as ListTypeNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"[MyType]"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      [MyType]"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "[MyType]
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        [MyType]
        "
      `);
  });
});

describe("ListValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment open
        [ # inline comment open
          42
          43
        # block comment close
        ] # inline comment close
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as ListValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"[42,43]"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment open
      #inline comment open
      [42,43
      #block comment close
      #inline comment close
      ]"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "[42, 43]
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment open
        # inline comment open
        [
          42
          43
        # block comment close
        # inline comment close
        ]
        "
      `);
  });
});

describe("NameNode", () => {
  const q = `
    {
      # block comment
      myName # inline comment
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).name;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"myName"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(
      '"myName"'
    );
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "myName
        "
      `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
          "myName
          "
        `);
  });
});

describe("NamedTypeNode", () => {
  const q = `
    type MyType {
      myField: 
      # block comment
      MyType # inline comment
    }
  `;
  const node = (parse(q).definitions[0] as ObjectTypeDefinitionNode).fields![0]
    .type as NamedTypeNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"MyType"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      MyType"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "MyType
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        MyType
        "
      `);
  });
});

describe("NonNullType", () => {
  const q = `
    type MyType {
      myField:
      # block comment 1
      MyType # inline comment 1
      # block comment 2
      ! # inline comment 2
    }
  `;
  const node = (parse(q).definitions[0] as ObjectTypeDefinitionNode).fields![0]
    .type as NonNullTypeNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"MyType!"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      MyType!"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "MyType!
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        MyType!
        "
      `);
  });
});

describe("NullValue", () => {
  const q = `
    {
      myField(myArg: 
        # block comment
        null # inline comment
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as NullValueNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"null"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment
      #inline comment
      null"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "null
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        null
        "
      `);
  });
});

describe("ObjectField", () => {
  const q = `
    {
      myField(myArg: {
        # block comment 1
        myFieldName # inline comment 1
        # block comment 2
        : # inline comment 2
        # block comment 3
        42 # inline comment 3
      })
    }
  `;
  const node = (
    (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as ObjectValueNode
  ).fields[0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"myFieldName:42"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      myFieldName:
      #block comment 3
      #inline comment 3
      42"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "myFieldName: 42
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        myFieldName: 
        # block comment 3
        # inline comment 3
        42
        "
      `);
  });
});

describe("ObjectTypeDefinition", () => {
  describe("inline interfaces", () => {
    const q = `
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      type # inline comment 2
      # block comment 3
      MyObjectType # inline comment 3
      # block comment 4
      implements # inline comment 4
      # block comment 5
      & # inline comment 5
      # block comment 6
      MyInterfaceType1 # inline comment 6
      # block comment 7
      & # inline comment 7
      # block comment 8
      MyInterfaceType2 # inline comment 8
      # block comment 9
      @myDirective # inline comment 9
      # block comment 10
      @myOtherDirective # inline comment 10
      # block comment 11
      { # inline comment 11
        myField: MyOutputType
      # block comment 12
      } # inline comment 12
    `;
    const node = parse(q).definitions[0] as ObjectTypeDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"\\"my description\\"type MyObjectType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        \\"my description\\"
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        type MyObjectType
        #block comment 4
        #inline comment 4
        implements
        #block comment 5
        #inline comment 5
        #block comment 6
        #inline comment 6
        MyInterfaceType1
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        &MyInterfaceType2
        #block comment 9
        #inline comment 9
        @myDirective
        #block comment 10
        #inline comment 10
        @myOtherDirective
        #block comment 11
        #inline comment 11
        {myField:MyOutputType
        #block comment 12
        #inline comment 12
        }"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"my description\\"
        type MyObjectType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          \\"my description\\"
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          type MyObjectType
          # block comment 4
          # inline comment 4
          implements
          # block comment 5
          # inline comment 5
          # block comment 6
          # inline comment 6
          & MyInterfaceType1
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          & MyInterfaceType2 
          # block comment 9
          # inline comment 9
          @myDirective 
          # block comment 10
          # inline comment 10
          @myOtherDirective 
          # block comment 11
          # inline comment 11
          {
            myField: MyOutputType
          # block comment 12
          # inline comment 12
          }
          "
        `);
    });
  });
  describe("multiline interfaces", () => {
    const q = `
      type MyObjectType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
    const node = parse(q).definitions[0] as ObjectTypeDefinitionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"type MyObjectType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "type MyObjectType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
    });
  });
});

describe("ObjectTypeExtension", () => {
  describe("inline interfaces", () => {
    const q = `
      # block comment 1
      extend # inline comment 1
      # block comment 2
      type # inline comment 2
      # block comment 3
      MyObjectType # inline comment 3
      # block comment 4
      implements # inline comment 4
      # block comment 5
      & # inline comment 5
      # block comment 6
      MyInterfaceType1 # inline comment 6
      # block comment 7
      & # inline comment 7
      # block comment 8
      MyInterfaceType2 # inline comment 8
      # block comment 9
      @myDirective # inline comment 9
      # block comment 10
      @myOtherDirective # inline comment 10
      # block comment 11
      { # inline comment 11
        myField: MyOutputType
      # block comment 12
      } # inline comment 12
    `;
    const node = parse(q).definitions[0] as ObjectTypeExtensionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
        "extend type MyObjectType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"
      `);
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        extend type MyObjectType
        #block comment 4
        #inline comment 4
        implements
        #block comment 5
        #inline comment 5
        #block comment 6
        #inline comment 6
        MyInterfaceType1
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        &MyInterfaceType2
        #block comment 9
        #inline comment 9
        @myDirective
        #block comment 10
        #inline comment 10
        @myOtherDirective
        #block comment 11
        #inline comment 11
        {myField:MyOutputType
        #block comment 12
        #inline comment 12
        }"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend type MyObjectType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          extend type MyObjectType
          # block comment 4
          # inline comment 4
          implements
          # block comment 5
          # inline comment 5
          # block comment 6
          # inline comment 6
          & MyInterfaceType1
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          & MyInterfaceType2 
          # block comment 9
          # inline comment 9
          @myDirective 
          # block comment 10
          # inline comment 10
          @myOtherDirective 
          # block comment 11
          # inline comment 11
          {
            myField: MyOutputType
          # block comment 12
          # inline comment 12
          }
          "
        `);
    });
  });
  describe("multiline interfaces", () => {
    const q = `
      extend type MyObjectType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
    const node = parse(q).definitions[0] as ObjectTypeDefinitionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"extend type MyObjectType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend type MyObjectType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
    });
  });
});

describe("ObjectValue", () => {
  describe("inline fields", () => {
    const q = `
      {
        myField(myArg: 
          # block comment open
          { # inline comment open
            myFieldName1: 42
            myFieldName2: "my string"
          # block comment close
          } # inline comment close
        )
      }
    `;
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as ObjectValueNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"{myFieldName1:42,myFieldName2:\\"my string\\"}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment open
        #inline comment open
        {myFieldName1:42,myFieldName2:\\"my string\\"
        #block comment close
        #inline comment close
        }"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "{ myFieldName1: 42, myFieldName2: \\"my string\\" }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment open
          # inline comment open
          {
            myFieldName1: 42
            myFieldName2: \\"my string\\"
          # block comment close
          # inline comment close
          }
          "
        `);
    });
  });
  describe("multiline fields", () => {
    const q = `
      {
        myField(myArg: {myFieldName1: "my very very long string", myFieldName2: "my very very long string"})
      }
    `;
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as ObjectValueNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"{myFieldName1:\\"my very very long string\\",myFieldName2:\\"my very very long string\\"}"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "{
          myFieldName1: \\"my very very long string\\"
          myFieldName2: \\"my very very long string\\"
        }
        "
      `);
    });
  });
});

describe("OperationDefinition", () => {
  describe("using the query shorthand", () => {
    const q = `
      # block comment
      {
        myField1
        myField2(myArg: 42)
      }
    `;
    const node = parse(q).definitions[0] as OperationDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"{myField1,myField2(myArg:42)}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment
        {myField1,myField2(myArg:42)}"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "{
          myField1
          myField2(myArg: 42)
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment
          {
            myField1
            myField2(myArg: 42)
          }
          "
        `);
    });
  });
  describe("using an unnamed operation", () => {
    const q = `
      # block comment
      mutation # inline comment
      {
        myField1
        myField2(myArg: 42)
      }
    `;
    const node = parse(q).definitions[0] as OperationDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"mutation{myField1,myField2(myArg:42)}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        mutation{myField1,myField2(myArg:42)}"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "mutation {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment
          # inline comment
          mutation {
            myField1
            myField2(myArg: 42)
          }
          "
        `);
    });
  });
  describe("using a named operation", () => {
    const q = `
      # block comment 1
      query # inline comment 1
      # block comment 2
      MyOperation # inline comment 2
      # block comment 3
      ( # inline comment 3
        $myVariable: Int = 42
      # block comment 4
      ) # inline comment 4
      # block comment 5
      @myDirective # inline comment 5
      # block comment 6
      @myOtherDirective # inline comment 6
      {
        myField1
        myField2(myArg: 42)
      }
    `;
    const node = parse(q).definitions[0] as OperationDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"query MyOperation($myVariable:Int=42)@myDirective@myOtherDirective{myField1,myField2(myArg:42)}"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        query MyOperation
        #block comment 3
        #inline comment 3
        ($myVariable:Int=42
        #block comment 4
        #inline comment 4
        )
        #block comment 5
        #inline comment 5
        @myDirective
        #block comment 6
        #inline comment 6
        @myOtherDirective{myField1,myField2(myArg:42)}"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "query MyOperation($myVariable: Int = 42) @myDirective @myOtherDirective {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          query MyOperation
          # block comment 3
          # inline comment 3
          (
            $myVariable: Int = 42
          # block comment 4
          # inline comment 4
          ) 
          # block comment 5
          # inline comment 5
          @myDirective 
          # block comment 6
          # inline comment 6
          @myOtherDirective {
            myField1
            myField2(myArg: 42)
          }
          "
        `);
    });
  });
  describe("multiline variables", () => {
    const q = `
      query MyOperation ($myVariable1: String = "my very very long string", $myVariable2: String = "my very very long string") {
        myField
      }
    `;
    const node = parse(q).definitions[0] as OperationDefinitionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"query MyOperation($myVariable1:String=\\"my very very long string\\",$myVariable2:String=\\"my very very long string\\"){myField}"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "query MyOperation(
          $myVariable1: String = \\"my very very long string\\"
          $myVariable2: String = \\"my very very long string\\"
        ) {
          myField
        }
        "
      `);
    });
  });
});

describe("OperationTypeDefinition", () => {
  const q = `
    schema {
      # block comment 1
      query # inline comment 1
      # block comment 2
      : # inline comment 2
      # block comment 3
      MyOutputType # inline comment 3
    }
  `;
  const node = (parse(q).definitions[0] as SchemaDefinitionNode)
    .operationTypes[0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"query:MyOutputType"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      query:
      #block comment 3
      #inline comment 3
      MyOutputType"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "query: MyOutputType
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        query: 
        # block comment 3
        # inline comment 3
        MyOutputType
        "
      `);
  });
});

describe("ScalarTypeDefinition", () => {
  const q = `
    # block comment 1
    "my description" # inline comment 1
    # block comment 2
    scalar # inline comment 2
    # block comment 3
    MyScalarType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
  `;
  const node = parse(q).definitions[0] as ScalarTypeDefinitionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"scalar MyScalarType@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      scalar MyScalarType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective"
    `);
  });
  it("prints without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      scalar MyScalarType @myDirective @myOtherDirective
      "
    `);
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        scalar MyScalarType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective
        "
      `);
  });
});

describe("ScalarTypeExtension", () => {
  const q = `
    # block comment 1
    extend # inline comment 1
    # block comment 2
    scalar # inline comment 2
    # block comment 3
    MyScalarType # inline comment 3
    # block comment 4
    @myDirective # inline comment 4
    # block comment 5
    @myOtherDirective # inline comment 5
  `;
  const node = parse(q).definitions[0] as ScalarTypeExtensionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"extend scalar MyScalarType@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      #block comment 3
      #inline comment 3
      extend scalar MyScalarType
      #block comment 4
      #inline comment 4
      @myDirective
      #block comment 5
      #inline comment 5
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "extend scalar MyScalarType @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        # block comment 3
        # inline comment 3
        extend scalar MyScalarType 
        # block comment 4
        # inline comment 4
        @myDirective 
        # block comment 5
        # inline comment 5
        @myOtherDirective
        "
      `);
  });
});

describe("SchemaDefinition", () => {
  const q = `
    # block comment 1
    "my description" # inline comment 1
    # block comment 2
    schema # inline comment 2
    # block comment 3
    @myDirective # inline comment 3
    # block comment 4
    @myOtherDirective # inline comment 4
    # block comment 5
    { # inline comment 5
      query: MyOutputType
    # block comment 6
    } # inline comment 6
  `;
  const node = parse(q).definitions[0] as SchemaDefinitionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"\\"my description\\"schema@myDirective@myOtherDirective{query:MyOutputType}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      \\"my description\\"
      #block comment 2
      #inline comment 2
      schema
      #block comment 3
      #inline comment 3
      @myDirective
      #block comment 4
      #inline comment 4
      @myOtherDirective
      #block comment 5
      #inline comment 5
      {query:MyOutputType
      #block comment 6
      #inline comment 6
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "\\"my description\\"
      schema @myDirective @myOtherDirective {
        query: MyOutputType
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        \\"my description\\"
        # block comment 2
        # inline comment 2
        schema 
        # block comment 3
        # inline comment 3
        @myDirective 
        # block comment 4
        # inline comment 4
        @myOtherDirective 
        # block comment 5
        # inline comment 5
        {
          query: MyOutputType
        # block comment 6
        # inline comment 6
        }
        "
      `);
  });
});

describe("SchemaExtension", () => {
  const q = `
    # block comment 1
    extend # inline comment 1
    # block comment 2
    schema # inline comment 2
    # block comment 3
    @myDirective # inline comment 3
    # block comment 4
    @myOtherDirective # inline comment 4
    # block comment 5
    { # inline comment 5
      query: MyOutputType
    # block comment 6
    } # inline comment 6
  `;
  const node = parse(q).definitions[0] as SchemaExtensionNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"extend schema@myDirective@myOtherDirective{query:MyOutputType}"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      extend schema
      #block comment 3
      #inline comment 3
      @myDirective
      #block comment 4
      #inline comment 4
      @myOtherDirective
      #block comment 5
      #inline comment 5
      {query:MyOutputType
      #block comment 6
      #inline comment 6
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "extend schema @myDirective @myOtherDirective {
        query: MyOutputType
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        extend schema 
        # block comment 3
        # inline comment 3
        @myDirective 
        # block comment 4
        # inline comment 4
        @myOtherDirective 
        # block comment 5
        # inline comment 5
        {
          query: MyOutputType
        # block comment 6
        # inline comment 6
        }
        "
      `);
  });
});

describe("SelectionSet", () => {
  const q = `
    # block comment open
    { # inline comment open
      myField1
      myField2(arg: 42)
    # block comment close
    } # inline comment close
  `;
  const node = (parse(q).definitions[0] as OperationDefinitionNode)
    .selectionSet;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"{myField1,myField2(arg:42)}"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment open
      #inline comment open
      {myField1,myField2(arg:42)
      #block comment close
      #inline comment close
      }"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "{
        myField1
        myField2(arg: 42)
      }
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment open
        # inline comment open
        {
          myField1
          myField2(arg: 42)
        # block comment close
        # inline comment close
        }
        "
      `);
  });
});

describe("StringValue", () => {
  describe("regular string values", () => {
    const q = `
      {
        myField(myArg: 
          # block comment
          "my string" # inline comment
        )
      }
    `;
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as StringValueNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot('"\\"my string\\""');
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        \\"my string\\""
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"my string\\"
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment
          # inline comment
          \\"my string\\"
          "
        `);
    });
  });
  describe("block string values without line breaks", () => {
    const q = `
      {
        myField(myArg: 
          # block comment
          """my \\""" string""" # inline comment
        )
      }
    `;
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as StringValueNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"\\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\""'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        \\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\""
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\"
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment
          # inline comment
          \\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\"
          "
        `);
    });
  });
  describe("block string values with line breaks", () => {
    const q = `
      {
        myField(myArg: 
          # block comment
          """my
          \\"""
          string""" # inline comment
        )
      }
    `;
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
        .selections[0] as FieldNode
    ).arguments![0].value as StringValueNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
        "\\"\\"\\"
        my
        \\\\\\"\\"\\"
        string
        \\"\\"\\""
      `);
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        \\"\\"\\"
        my
        \\\\\\"\\"\\"
        string
        \\"\\"\\""
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"\\"\\"
        my
        \\\\\\"\\"\\"
        string
        \\"\\"\\"
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment
          # inline comment
          \\"\\"\\"
          my
          \\\\\\"\\"\\"
          string
          \\"\\"\\"
          "
        `);
    });
  });
});

describe("UnionTypeDefinition", () => {
  describe("inline types", () => {
    const q = `
      # block comment 1
      "my description" # inline comment 1
      # block comment 2
      union # inline comment 2
      # block comment 3
      MyUnionType # inline comment 3
      # block comment 4
      @myDirective # inline comment 4
      # block comment 5
      @myOtherDirective # inline comment 5
      # block comment 6
      = # inline comment 6
      # block comment 7
      | # inline comment 7
      # block comment 8
      MyType1 # inline comment 8
      # block comment 9
      | # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
    `;
    const node = parse(q).definitions[0] as UnionTypeDefinitionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"\\"my description\\"union MyUnionType@myDirective@myOtherDirective=MyType1|MyType2"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        \\"my description\\"
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        union MyUnionType
        #block comment 4
        #inline comment 4
        @myDirective
        #block comment 5
        #inline comment 5
        @myOtherDirective
        #block comment 6
        #inline comment 6
        =
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        MyType1
        #block comment 9
        #inline comment 9
        #block comment 10
        #inline comment 10
        |MyType2"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "\\"my description\\"
        union MyUnionType @myDirective @myOtherDirective = MyType1 | MyType2
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          \\"my description\\"
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          union MyUnionType 
          # block comment 4
          # inline comment 4
          @myDirective 
          # block comment 5
          # inline comment 5
          @myOtherDirective
          # block comment 6
          # inline comment 6
          =
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          | MyType1
          # block comment 9
          # inline comment 9
          # block comment 10
          # inline comment 10
          | MyType2
          "
        `);
    });
  });
  describe("multiline types", () => {
    const q = `
      union MyUnionType = MyVeryVeryVeryVeryVeryLongType1 | MyVeryVeryVeryVeryVeryLongType2
    `;
    const node = parse(q).definitions[0] as UnionTypeDefinitionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"union MyUnionType=MyVeryVeryVeryVeryVeryLongType1|MyVeryVeryVeryVeryVeryLongType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "union MyUnionType =
        | MyVeryVeryVeryVeryVeryLongType1
        | MyVeryVeryVeryVeryVeryLongType2
        "
      `);
    });
  });
});

describe("UnionTypeExtension", () => {
  describe("inline types", () => {
    const q = `
      # block comment 1
      extend # inline comment 1
      # block comment 2
      union # inline comment 2
      # block comment 3
      MyUnionType # inline comment 3
      # block comment 4
      @myDirective # inline comment 4
      # block comment 5
      @myOtherDirective # inline comment 5
      # block comment 6
      = # inline comment 6
      # block comment 7
      | # inline comment 7
      # block comment 8
      MyType1 # inline comment 8
      # block comment 9
      | # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
    `;
    const node = parse(q).definitions[0] as UnionTypeExtensionNode;
    it("prints without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"extend union MyUnionType@myDirective@myOtherDirective=MyType1|MyType2"'
      );
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        extend union MyUnionType
        #block comment 4
        #inline comment 4
        @myDirective
        #block comment 5
        #inline comment 5
        @myOtherDirective
        #block comment 6
        #inline comment 6
        =
        #block comment 7
        #inline comment 7
        #block comment 8
        #inline comment 8
        MyType1
        #block comment 9
        #inline comment 9
        #block comment 10
        #inline comment 10
        |MyType2"
      `);
    });
    it("prints pretty without comments", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend union MyUnionType @myDirective @myOtherDirective = MyType1 | MyType2
        "
      `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true, pretty: true }))
        .toMatchInlineSnapshot(`
          "# block comment 1
          # inline comment 1
          # block comment 2
          # inline comment 2
          # block comment 3
          # inline comment 3
          extend union MyUnionType 
          # block comment 4
          # inline comment 4
          @myDirective 
          # block comment 5
          # inline comment 5
          @myOtherDirective
          # block comment 6
          # inline comment 6
          =
          # block comment 7
          # inline comment 7
          # block comment 8
          # inline comment 8
          | MyType1
          # block comment 9
          # inline comment 9
          # block comment 10
          # inline comment 10
          | MyType2
          "
        `);
    });
  });
  describe("multiline types", () => {
    const q = `
      extend union MyUnionType = MyVeryVeryVeryVeryVeryLongType1 | MyVeryVeryVeryVeryVeryLongType2
    `;
    const node = parse(q).definitions[0] as UnionTypeExtensionNode;
    it("prints", () => {
      expect(print(node)).toMatchInlineSnapshot(
        '"extend union MyUnionType=MyVeryVeryVeryVeryVeryLongType1|MyVeryVeryVeryVeryVeryLongType2"'
      );
    });
    it("prints pretty", () => {
      expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
        "extend union MyUnionType =
        | MyVeryVeryVeryVeryVeryLongType1
        | MyVeryVeryVeryVeryVeryLongType2
        "
      `);
    });
  });
});

describe("Variable", () => {
  const q = `
    {
      myField(myArg: 
        # block comment 1
        $ # inline comment 1
        # block comment 2
        myVariable # inline comment 2
      )
    }
  `;
  const node = (
    (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode
  ).arguments![0].value as VariableNode;
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot('"$myVariable"');
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      $myVariable"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "$myVariable
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        $myVariable
        "
      `);
  });
});

describe("VariableDefinition", () => {
  const q = `
    query (
      # block comment 1
      $myVariable # inline comment 1
      # block comment 2
      : # inline comment 2
      # block comment 3
      MyType # inline comment 3
      # block comment 4
      = # inline comment 4
      # block comment 5
      42 # inline comment 5
      # block comment 6
      @myDirective # inline comment 6
      # block comment 7
      @myOtherDirective # inline comment 7
    ) {
      myField
    }
  `;
  const node = (parse(q).definitions[0] as OperationDefinitionNode)
    .variableDefinitions![0];
  it("prints without comments", () => {
    expect(print(node)).toMatchInlineSnapshot(
      '"$myVariable:MyType=42@myDirective@myOtherDirective"'
    );
  });
  it("prints with comments", () => {
    expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "#block comment 1
      #inline comment 1
      #block comment 2
      #inline comment 2
      $myVariable:
      #block comment 3
      #inline comment 3
      MyType
      #block comment 4
      #inline comment 4
      #block comment 5
      #inline comment 5
      =42
      #block comment 6
      #inline comment 6
      @myDirective
      #block comment 7
      #inline comment 7
      @myOtherDirective"
    `);
  });
  it("prints pretty without comments", () => {
    expect(print(node, { pretty: true })).toMatchInlineSnapshot(`
      "$myVariable: MyType = 42 @myDirective @myOtherDirective
      "
    `);
  });
  it("prints pretty with comments", () => {
    expect(print(node, { preserveComments: true, pretty: true }))
      .toMatchInlineSnapshot(`
        "# block comment 1
        # inline comment 1
        # block comment 2
        # inline comment 2
        $myVariable: 
        # block comment 3
        # inline comment 3
        MyType
        # block comment 4
        # inline comment 4
        # block comment 5
        # inline comment 5
        = 42 
        # block comment 6
        # inline comment 6
        @myDirective 
        # block comment 7
        # inline comment 7
        @myOtherDirective
        "
      `);
  });
});
