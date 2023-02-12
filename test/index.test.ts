import { readFileSync } from "fs";
import type {
  ArgumentNode,
  BooleanValueNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  EnumTypeDefinitionNode,
  EnumTypeExtensionNode,
  EnumValueDefinitionNode,
  EnumValueNode,
  FieldDefinitionNode,
  FieldNode,
  FloatValueNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  InputObjectTypeDefinitionNode,
  InputObjectTypeExtensionNode,
  InputValueDefinitionNode,
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
  VariableDefinitionNode,
  VariableNode,
} from "graphql";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { print } from "../src";

const KITCHEN_SINK = readFileSync(
  join(__dirname, "utils", "kitchenSink.gql"),
  "utf8"
);

/* eslint-disable @typescript-eslint/no-var-requires */
const latestGraphQLVersion = [
  "graphql~16.6",
  require("graphql_16_6").parse as typeof parse,
] as const;
const allGraphqlVersions = [
  latestGraphQLVersion,
  ["graphql~16.5", require("graphql_16_5").parse as typeof parse],
  ["graphql~16.4", require("graphql_16_4").parse as typeof parse],
  ["graphql~16.3", require("graphql_16_3").parse as typeof parse],
  ["graphql~16.2", require("graphql_16_2").parse as typeof parse],
  ["graphql~16.1", require("graphql_16_1").parse as typeof parse],
  ["graphql~16.0", require("graphql_16_0").parse as typeof parse],
  ["graphql~15.8", require("graphql_15_8").parse as typeof parse],
  ["graphql~15.7", require("graphql_15_7").parse as typeof parse],
  ["graphql~15.6", require("graphql_15_6").parse as typeof parse],
  ["graphql~15.5", require("graphql_15_5").parse as typeof parse],
  ["graphql~15.4", require("graphql_15_4").parse as typeof parse],
  ["graphql~15.3", require("graphql_15_3").parse as typeof parse],
  ["graphql~15.2", require("graphql_15_2").parse as typeof parse],
  ["graphql~15.1", require("graphql_15_1").parse as typeof parse],
  ["graphql~15.0", require("graphql_15_0").parse as typeof parse],
] as const;
/* eslint-enable @typescript-eslint/no-var-requires */

describe.each(
  process.env.ALL_GRAPHQL_VERSIONS ? allGraphqlVersions : [latestGraphQLVersion]
)("%", (_, parse) => {
  describe("kitchen sink", () => {
    describe("pretty printing", () => {
      it("prints without comments", () => {
        expect(print(parse(KITCHEN_SINK))).toMatchInlineSnapshot(`
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
        expect(print(parse(KITCHEN_SINK), { preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    describe("minified printing", () => {
      it("prints without comments", () => {
        expect(print(parse(KITCHEN_SINK), { minified: true }))
          .toMatchInlineSnapshot(`
          "query queryName($foo:ComplexType,$site:Site=MOBILE)@onQuery{whoever123is:node(id:[123,456]){id,...on User@onInlineFragment{field2{id,alias:field1(first:10,after:$foo)@include(if:$foo){id,...frag@onFragmentSpread}}},...@skip(unless:$foo){id},...{id}}}
          mutation likeStory@onMutation{like(story:123)@onField{story{id@onField}}}
          subscription StoryLikeSubscription($input:StoryLikeSubscribeInput@onVariableDefinition)@onSubscription{storyLikeSubscribe(input:$input){story{likers{count},likeSentence{text}}}}
          fragment frag on Friend@onFragmentDefinition{foo(size:$size,bar:$b,obj:{key:\\"value\\",block:\\"\\"\\"block string uses \\\\\\"\\"\\"\\"\\"\\"})}
          {unnamed(truthy:true,falsy:false,nullish:null),query}
          query{__typename}"
        `);
      });
      it("prints with comments", () => {
        expect(
          print(parse(KITCHEN_SINK), { minified: true, preserveComments: true })
        ).toMatchInlineSnapshot(`
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
  });

  const LANGUAGE = readFileSync(
    join(__dirname, "utils", "language.gql"),
    "utf8"
  );

  describe("idempotency for parsing-printing", () => {
    it("is idempotent without comments", () => {
      const language = print(parse(LANGUAGE), { minified: true });
      expect(print(parse(language), { minified: true })).toBe(language);
    });
    it("is idempotent with comments", () => {
      const language = print(parse(LANGUAGE), {
        minified: true,
        preserveComments: true,
      });
      expect(
        print(parse(language), { minified: true, preserveComments: true })
      ).toBe(language);
    });
  });

  const COMMENTS = readFileSync(
    join(__dirname, "utils", "comments.gql"),
    "utf8"
  );

  describe("preserving comments", () => {
    it("does not remove any comments when standard printing", () => {
      const printed = print(parse(COMMENTS), { preserveComments: true });
      for (let i = 1; i <= 46; i++)
        expect(printed).toMatch(new RegExp("# comment " + i + "(\\n| |$)"));
    });
    it("does not remove any comments when minified printing", () => {
      const printed = print(parse(COMMENTS), {
        minified: true,
        preserveComments: true,
      });
      for (let i = 1; i <= 46; i++)
        expect(printed).toMatch(new RegExp("#comment " + i + "(\\n|#|$)"));
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0];
    it("prints standard without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "myArg: \\"my string\\"
      "
    `);
    });
    it("prints standard with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment 1
      # inline comment 1
      # block comment 2
      # inline comment 2
      myArg: \\"my string\\"
      "
      `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"myArg:\\"my string\\""'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        myArg:\\"my string\\""
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as BooleanValueNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "true
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      true
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot('"true"');
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        true"
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
      const node = (
        (parse(q).definitions[0] as OperationDefinitionNode)
          .directives as DirectiveNode[]
      )[0];
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "@myDirective(myArg: \\"my string\\")
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"@myDirective(myArg:\\"my string\\")"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline arguments", () => {
      const q = `
      query @myDirective(myArg1: "my very very long string", myArg2: "my very very long string") {
        myField
      }
    `;
      const node = (
        (parse(q).definitions[0] as OperationDefinitionNode)
          .directives as DirectiveNode[]
      )[0];
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "@myDirective(
          myArg1: \\"my very very long string\\"
          myArg2: \\"my very very long string\\"
        )
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"@myDirective(myArg1:\\"my very very long string\\",myArg2:\\"my very very long string\\")"'
        );
      });
    });
    describe("arguments with comments", () => {
      const q = `
      query @myDirective(
        myArg1: "my string"
        # comment
        myArg2: 42
      ) {
        myField
      }
    `;
      const node = (
        (parse(q).definitions[0] as OperationDefinitionNode)
          .directives as DirectiveNode[]
      )[0];
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "@myDirective(
            myArg1: \\"my string\\"
            # comment
            myArg2: 42
          )
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "@myDirective(myArg1:\\"my string\\"
            #comment
            myArg2:42)"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"my description\\"
        directive @myDirective(myArg: Int = 42) repeatable on QUERY | MUTATION
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my description\\"directive@myDirective(myArg:Int=42) repeatable on QUERY|MUTATION"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("inline", () => {
      const q = `
      directive @myDirective
      # block comment
      on # inline comment
      QUERY | MUTATION
    `;
      const node = parse(q).definitions[0] as DirectiveDefinitionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "directive @myDirective on QUERY | MUTATION
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "directive @myDirective
        # block comment
        # inline comment
        on QUERY | MUTATION
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"directive@myDirective on QUERY|MUTATION"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "directive@myDirective
          #block comment
          #inline comment
          on QUERY|MUTATION"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
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
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"directive@myDirective on QUERY|MUTATION|SUBSCRIPTION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|VARIABLE_DEFINITION"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "directive@myDirective
          #block comment
          #inline comment
          on QUERY|MUTATION|SUBSCRIPTION|FIELD|FRAGMENT_DEFINITION|FRAGMENT_SPREAD|INLINE_FRAGMENT|VARIABLE_DEFINITION"
        `);
      });
    });
    describe("locations with comments", () => {
      const q = `
      directive @myDirective on QUERY
      # block comment 9
      | # inline comment 9
      # block comment 10
      MUTATION # inline comment 10
      | SUBSCRIPTION
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "directive @myDirective on QUERY | MUTATION | SUBSCRIPTION
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "directive @myDirective on
        | QUERY
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        | MUTATION
        | SUBSCRIPTION
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"directive@myDirective on QUERY|MUTATION|SUBSCRIPTION"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "directive@myDirective on QUERY
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          |MUTATION|SUBSCRIPTION"
        `);
      });
    });
    describe("input value definitions with comments", () => {
      const q = `
      directive @myDirective (
        myArg1: MyInputType1
        # comment
        myArg2: MyInputType1
      ) on QUERY
    `;
      const node = parse(q).definitions[0] as DirectiveDefinitionNode;
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "directive @myDirective(
            myArg1: MyInputType1
            # comment
            myArg2: MyInputType1
          ) on QUERY
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "directive@myDirective(myArg1:MyInputType1
            #comment
            myArg2:MyInputType1) on QUERY"
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "type MyObjectType {
        field: Int
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "type MyObjectType {
        field: Int
      }

      # block comment
      # inline comment
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"type MyObjectType{field:Int}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "type MyObjectType{field:Int}
        #block comment
        #inline comment"
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      enum MyEnumType @myDirective @myOtherDirective {
        MY_ENUM_VALUE
        MY_OTHER_ENUM_VALUE
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"enum MyEnumType@myDirective@myOtherDirective{MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "extend enum MyEnumType @myDirective @myOtherDirective {
        MY_ENUM_VALUE
        MY_OTHER_ENUM_VALUE
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"extend enum MyEnumType@myDirective@myOtherDirective{MY_ENUM_VALUE,MY_OTHER_ENUM_VALUE}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as EnumValueNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "MY_ENUM_VALUE
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      MY_ENUM_VALUE
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"MY_ENUM_VALUE"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        MY_ENUM_VALUE"
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
    const node = (
      (parse(q).definitions[0] as EnumTypeDefinitionNode)
        .values as EnumValueDefinitionNode[]
    )[0];
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      MY_ENUM_VALUE @myDirective @myOtherDirective
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"MY_ENUM_VALUE@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "myAlias: myField(myArg: 42) @myDirective @myOtherDirective {
          mySubField
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"myAlias:myField(myArg:42)@myDirective@myOtherDirective{mySubField}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "myField(
          myArg1: \\"my very very long string\\"
          myArg2: \\"my very very long string\\"
        ) {
          mySubField
        }
        "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"myField(myArg1:\\"my very very long string\\",myArg2:\\"my very very long string\\"){mySubField}"'
        );
      });
    });
    describe("arguments with comments", () => {
      const q = `
      {
        myField(
          myArg1: 42
          # comment
          myArg2: "my string"
        )
      }
    `;
      const node = (parse(q).definitions[0] as OperationDefinitionNode)
        .selectionSet.selections[0] as FieldNode;
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "myField(
            myArg1: 42
            # comment
            myArg2: \\"my string\\"
          )
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "myField(myArg1:42
            #comment
            myArg2:\\"my string\\")"
          `);
      });
    });
  });

  describe("FieldDefinition", () => {
    describe("with comments", () => {
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
      const node = (
        (parse(q).definitions[0] as ObjectTypeDefinitionNode)
          .fields as FieldDefinitionNode[]
      )[0];
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"my description\\"
        myField(myArg: MyInputType = 42): MyOutputType @myDirective @myOtherDirective
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my description\\"myField(myArg:MyInputType=42):MyOutputType@myDirective@myOtherDirective"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("input value definitions with comments", () => {
      const q = `
        type MyType {
          myField(
            myArg1: MyInputType1
            # comment
            myArg2: MyInputType2
          ): MyOutputType
        }
      `;
      const node = (
        (parse(q).definitions[0] as ObjectTypeDefinitionNode)
          .fields as FieldDefinitionNode[]
      )[0];
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "myField(
            myArg1: MyInputType1
            # comment
            myArg2: MyInputType2
          ): MyOutputType
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "myField(myArg1:MyInputType1
          #comment
          myArg2:MyInputType2):MyOutputType"
        `);
      });
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as FloatValueNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "42.43e44
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      42.43e44
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"42.43e44"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        42.43e44"
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "fragment MyFragmentName on MyType @myDirective @myOtherDirective {
        myField
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"fragment MyFragmentName on MyType@myDirective@myOtherDirective{myField}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .selectionSet.selections[0] as FragmentSpreadNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "...MyFragmentName @myDirective @myOtherDirective
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"...MyFragmentName@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    const node = (parse(q).definitions[0] as OperationDefinitionNode)
      .selectionSet.selections[0] as InlineFragmentNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "...on MyType @myDirective @myOtherDirective {
        myField
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"...on MyType@myDirective@myOtherDirective{myField}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      input MyInputObjectType @myDirective @myOtherDirective {
        myField: MyInputType
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"input MyInputObjectType@myDirective@myOtherDirective{myField:MyInputType}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "extend input MyInputObjectType @myDirective @myOtherDirective {
        myField: MyInputType
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"extend input MyInputObjectType@myDirective@myOtherDirective{myField:MyInputType}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    const node = (
      (
        (parse(q).definitions[0] as ObjectTypeDefinitionNode)
          .fields as FieldDefinitionNode[]
      )[0].arguments as InputValueDefinitionNode[]
    )[0];
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      myInputField: MyInputType = 42 @myDirective @myOtherDirective
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"myInputField:MyInputType=42@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
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
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my description\\"interface MyInterfaceType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline interfaces", () => {
      const q = `
      interface MyInterfaceType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
      const node = parse(q).definitions[0] as InterfaceTypeDefinitionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "interface MyInterfaceType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"interface MyInterfaceType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
        );
      });
    });
    describe("interfaces with comments", () => {
      const q = `
      interface MyInterfaceType implements MyType1
      # block comment 9
      & # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      & MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "interface MyInterfaceType implements MyType1 & MyType2 & MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "interface MyInterfaceType implements
        & MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        & MyType2
        & MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"interface MyInterfaceType implements MyType1&MyType2&MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "interface MyInterfaceType implements MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          &MyType2&MyType3"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend interface MyInterfaceType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline interfaces", () => {
      const q = `
      extend interface MyInterfaceType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
      const node = parse(q).definitions[0] as InterfaceTypeExtensionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend interface MyInterfaceType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
        );
      });
    });
    describe("interfaces with comments", () => {
      const q = `
      extend interface MyInterfaceType implements MyType1
      # block comment 9
      & # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      & MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements MyType1 & MyType2 & MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "extend interface MyInterfaceType implements
        & MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        & MyType2
        & MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend interface MyInterfaceType implements MyType1&MyType2&MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "extend interface MyInterfaceType implements MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          &MyType2&MyType3"
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as IntValueNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "42
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      42
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot('"42"');
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        42"
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
    const node = (
      (parse(q).definitions[0] as ObjectTypeDefinitionNode)
        .fields as FieldDefinitionNode[]
    )[0].type as ListTypeNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "[MyType]
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"[MyType]"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        #block comment 3
        #inline comment 3
        [MyType]"
      `);
    });
  });

  describe("ListValue", () => {
    describe("empty list", () => {
      const q = `
      {
        myField(myArg:
          # block comment open
          [ # inline comment open
          # block comment close
          ] # inline comment close
        )
      }
    `;
      const node = (
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ListValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "[]
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment open
        # inline comment open
        [
        # block comment close
        # inline comment close
        ]
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot('"[]"');
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment open
          #inline comment open
          [
          #block comment close
          #inline comment close
          ]"
        `);
      });
    });
    describe("non-empty list", () => {
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ListValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "[42, 43]
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"[42,43]"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment open
          #inline comment open
          [42,43
          #block comment close
          #inline comment close
          ]"
        `);
      });
    });
    describe("values with comments", () => {
      const q = `
      {
        myField(myArg: [
          42
          # comment
          43
        ])
      }
    `;
      const node = (
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ListValueNode;
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "[
            42
            # comment
            43
          ]
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "[42
            #comment
            43]"
          `);
      });
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "myName
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "myName
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot('"myName"');
    });
    it("prints minified with comments", () => {
      expect(
        print(node, { minified: true, preserveComments: true })
      ).toMatchInlineSnapshot('"myName"');
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
    const node = (
      (parse(q).definitions[0] as ObjectTypeDefinitionNode)
        .fields as FieldDefinitionNode[]
    )[0].type as NamedTypeNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "MyType
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      MyType
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot('"MyType"');
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        MyType"
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
    const node = (
      (parse(q).definitions[0] as ObjectTypeDefinitionNode)
        .fields as FieldDefinitionNode[]
    )[0].type as NonNullTypeNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "MyType!
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment 1
      # inline comment 1
      # block comment 2
      # inline comment 2
      MyType!
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"MyType!"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        MyType!"
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as NullValueNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "null
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment
      # inline comment
      null
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot('"null"');
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment
        #inline comment
        null"
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ObjectValueNode
    ).fields[0];
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "myFieldName: 42
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"myFieldName:42"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
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
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my description\\"type MyObjectType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline interfaces", () => {
      const q = `
      type MyObjectType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
      const node = parse(q).definitions[0] as ObjectTypeDefinitionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "type MyObjectType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"type MyObjectType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
        );
      });
    });
    describe("interfaces with comments", () => {
      const q = `
      type MyObjectType implements MyType1
      # block comment 9
      & # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      & MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "type MyObjectType implements MyType1 & MyType2 & MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "type MyObjectType implements
        & MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        & MyType2
        & MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"type MyObjectType implements MyType1&MyType2&MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "type MyObjectType implements MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          &MyType2&MyType3"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend type MyObjectType implements
        & MyInterfaceType1
        & MyInterfaceType2 @myDirective @myOtherDirective {
          myField: MyOutputType
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(`
        "extend type MyObjectType implements MyInterfaceType1&MyInterfaceType2@myDirective@myOtherDirective{myField:MyOutputType}"
      `);
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline interfaces", () => {
      const q = `
      extend type MyObjectType implements MyVeryVeryLongInterfaceType1 & MyVeryVeryLongInterfaceType2
    `;
      const node = parse(q).definitions[0] as ObjectTypeDefinitionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend type MyObjectType implements
        & MyVeryVeryLongInterfaceType1
        & MyVeryVeryLongInterfaceType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend type MyObjectType implements MyVeryVeryLongInterfaceType1&MyVeryVeryLongInterfaceType2"'
        );
      });
    });
    describe("interfaces with comments", () => {
      const q = `
      extend type MyObjectType implements MyType1
      # block comment 9
      & # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      & MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend type MyObjectType implements MyType1 & MyType2 & MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "extend type MyObjectType implements
        & MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        & MyType2
        & MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend type MyObjectType implements MyType1&MyType2&MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "extend type MyObjectType implements MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          &MyType2&MyType3"
        `);
      });
    });
  });

  describe("ObjectValue", () => {
    describe("empty fields", () => {
      const q = `
      {
        myField(myArg:
          # block comment open
          { # inline comment open
          # block comment close
          } # inline comment close
        )
      }
    `;
      const node = (
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ObjectValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "{}
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment open
        # inline comment open
        {
        # block comment close
        # inline comment close
        }
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot('"{}"');
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment open
          #inline comment open
          {
          #block comment close
          #inline comment close
          }"
        `);
      });
    });
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ObjectValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "{ myFieldName1: 42, myFieldName2: \\"my string\\" }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"{myFieldName1:42,myFieldName2:\\"my string\\"}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment open
          #inline comment open
          {myFieldName1:42,myFieldName2:\\"my string\\"
          #block comment close
          #inline comment close
          }"
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ObjectValueNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "{
          myFieldName1: \\"my very very long string\\"
          myFieldName2: \\"my very very long string\\"
        }
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"{myFieldName1:\\"my very very long string\\",myFieldName2:\\"my very very long string\\"}"'
        );
      });
    });
    describe("values with comments", () => {
      const q = `
      {
        myField(myArg: {
          myFieldName1: 42
          # comment
          myFieldName2: "my string"
        })
      }
    `;
      const node = (
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as ObjectValueNode;
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "{
            myFieldName1: 42
            # comment
            myFieldName2: \\"my string\\"
          }
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "{myFieldName1:42
            #comment
            myFieldName2:\\"my string\\"}"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "{
          myField1
          myField2(myArg: 42)
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment
        {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"{myField1,myField2(myArg:42)}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment
          {myField1,myField2(myArg:42)}"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "mutation {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        mutation {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"mutation{myField1,myField2(myArg:42)}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment
          #inline comment
          mutation{myField1,myField2(myArg:42)}"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "query MyOperation($myVariable: Int = 42) @myDirective @myOtherDirective {
          myField1
          myField2(myArg: 42)
        }
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"query MyOperation($myVariable:Int=42)@myDirective@myOtherDirective{myField1,myField2(myArg:42)}"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline variables", () => {
      const q = `
      query MyOperation ($myVariable1: String = "my very very long string", $myVariable2: String = "my very very long string") {
        myField
      }
    `;
      const node = parse(q).definitions[0] as OperationDefinitionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "query MyOperation(
          $myVariable1: String = \\"my very very long string\\"
          $myVariable2: String = \\"my very very long string\\"
        ) {
          myField
        }
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"query MyOperation($myVariable1:String=\\"my very very long string\\",$myVariable2:String=\\"my very very long string\\"){myField}"'
        );
      });
    });
    describe("variable definitions with comments", () => {
      const q = `
      query MyOperation(
        $myVariable1: Int
        # comment
        $myVariable2: String
      ) {
        myField
      }
    `;
      const node = parse(q).definitions[0] as OperationDefinitionNode;
      it("prints pretty", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
          "query MyOperation(
            $myVariable1: Int
            # comment
            $myVariable2: String
          ) {
            myField
          }
          "
        `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
            "query MyOperation($myVariable1:Int
            #comment
            $myVariable2:String){myField}"
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "query: MyOutputType
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"query:MyOutputType"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      scalar MyScalarType @myDirective @myOtherDirective
      "
    `);
    });
    it("prints with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"scalar MyScalarType@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "extend scalar MyScalarType @myDirective @myOtherDirective
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"extend scalar MyScalarType@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "\\"my description\\"
      schema @myDirective @myOtherDirective {
        query: MyOutputType
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"\\"my description\\"schema@myDirective@myOtherDirective{query:MyOutputType}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "extend schema @myDirective @myOtherDirective {
        query: MyOutputType
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"extend schema@myDirective@myOtherDirective{query:MyOutputType}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "{
        myField1
        myField2(arg: 42)
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"{myField1,myField2(arg:42)}"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment open
        #inline comment open
        {myField1,myField2(arg:42)
        #block comment close
        #inline comment close
        }"
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as StringValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"my string\\"
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        \\"my string\\"
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my string\\""'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment
          #inline comment
          \\"my string\\""
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as StringValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\"
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "# block comment
        # inline comment
        \\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\"
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\""'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment
          #inline comment
          \\"\\"\\"my \\\\\\"\\"\\" string\\"\\"\\""
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
        (
          (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
            .selections[0] as FieldNode
        ).arguments as ArgumentNode[]
      )[0].value as StringValueNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"\\"\\"
        my
        \\\\\\"\\"\\"
        string
        \\"\\"\\"
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(`
        "\\"\\"\\"
        my
        \\\\\\"\\"\\"
        string
        \\"\\"\\""
      `);
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "#block comment
          #inline comment
          \\"\\"\\"
          my
          \\\\\\"\\"\\"
          string
          \\"\\"\\""
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "\\"my description\\"
        union MyUnionType @myDirective @myOtherDirective = MyType1 | MyType2
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"\\"my description\\"union MyUnionType@myDirective@myOtherDirective=MyType1|MyType2"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline types", () => {
      const q = `
      union MyUnionType = MyVeryVeryVeryVeryVeryLongType1 | MyVeryVeryVeryVeryVeryLongType2
    `;
      const node = parse(q).definitions[0] as UnionTypeDefinitionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "union MyUnionType =
        | MyVeryVeryVeryVeryVeryLongType1
        | MyVeryVeryVeryVeryVeryLongType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"union MyUnionType=MyVeryVeryVeryVeryVeryLongType1|MyVeryVeryVeryVeryVeryLongType2"'
        );
      });
    });
    describe("types with comments", () => {
      const q = `
      union MyUnionType = MyType1
      # block comment 9
      | # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      | MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "union MyUnionType = MyType1 | MyType2 | MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "union MyUnionType =
        | MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        | MyType2
        | MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"union MyUnionType=MyType1|MyType2|MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "union MyUnionType=MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          |MyType2|MyType3"
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
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend union MyUnionType @myDirective @myOtherDirective = MyType1 | MyType2
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend union MyUnionType@myDirective@myOtherDirective=MyType1|MyType2"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
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
    });
    describe("multiline types", () => {
      const q = `
      extend union MyUnionType = MyVeryVeryVeryVeryVeryLongType1 | MyVeryVeryVeryVeryVeryLongType2
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend union MyUnionType =
        | MyVeryVeryVeryVeryVeryLongType1
        | MyVeryVeryVeryVeryVeryLongType2
        "
      `);
      });
      it("prints minified", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend union MyUnionType=MyVeryVeryVeryVeryVeryLongType1|MyVeryVeryVeryVeryVeryLongType2"'
        );
      });
    });
    describe("types with comments", () => {
      const q = `
      extend union MyUnionType = MyType1
      # block comment 9
      | # inline comment 9
      # block comment 10
      MyType2 # inline comment 10
      | MyType3
    `;
      const node = parse(q).definitions[0] as UnionTypeExtensionNode;
      it("prints pretty without comments", () => {
        expect(print(node)).toMatchInlineSnapshot(`
        "extend union MyUnionType = MyType1 | MyType2 | MyType3
        "
      `);
      });
      it("prints pretty with comments", () => {
        expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
        "extend union MyUnionType =
        | MyType1
        # block comment 9
        # inline comment 9
        # block comment 10
        # inline comment 10
        | MyType2
        | MyType3
        "
      `);
      });
      it("prints minified without comments", () => {
        expect(print(node, { minified: true })).toMatchInlineSnapshot(
          '"extend union MyUnionType=MyType1|MyType2|MyType3"'
        );
      });
      it("prints minified with comments", () => {
        expect(print(node, { minified: true, preserveComments: true }))
          .toMatchInlineSnapshot(`
          "extend union MyUnionType=MyType1
          #block comment 9
          #inline comment 9
          #block comment 10
          #inline comment 10
          |MyType2|MyType3"
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
      (
        (parse(q).definitions[0] as OperationDefinitionNode).selectionSet
          .selections[0] as FieldNode
      ).arguments as ArgumentNode[]
    )[0].value as VariableNode;
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "$myVariable
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment 1
      # inline comment 1
      # block comment 2
      # inline comment 2
      $myVariable
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"$myVariable"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment 1
        #inline comment 1
        #block comment 2
        #inline comment 2
        $myVariable"
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
    const node = (
      (parse(q).definitions[0] as OperationDefinitionNode)
        .variableDefinitions as VariableDefinitionNode[]
    )[0];
    it("prints pretty without comments", () => {
      expect(print(node)).toMatchInlineSnapshot(`
      "$myVariable: MyType = 42 @myDirective @myOtherDirective
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(node, { preserveComments: true })).toMatchInlineSnapshot(`
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
    it("prints minified without comments", () => {
      expect(print(node, { minified: true })).toMatchInlineSnapshot(
        '"$myVariable:MyType=42@myDirective@myOtherDirective"'
      );
    });
    it("prints minified with comments", () => {
      expect(print(node, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
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
  });

  describe("printing a list of nodes", () => {
    const q1 = `
    # block comment 1
    query MyQuery {
      myQueryField
    }
    # block comment 2
    `;
    const q2 = `
    # block comment 3
    mutation MyMutation {
      myMutationField
    }
    # block comment 4
  `;
    const nodes = [parse(q1), parse(q2)];
    it("prints pretty without comments", () => {
      expect(print(nodes)).toMatchInlineSnapshot(`
      "query MyQuery {
        myQueryField
      }

      mutation MyMutation {
        myMutationField
      }
      "
    `);
    });
    it("prints pretty with comments", () => {
      expect(print(nodes, { preserveComments: true })).toMatchInlineSnapshot(`
      "# block comment 1
      query MyQuery {
        myQueryField
      }

      # block comment 2

      # block comment 3
      mutation MyMutation {
        myMutationField
      }

      # block comment 4
      "
    `);
    });
    it("prints minified without comments", () => {
      expect(print(nodes, { minified: true })).toMatchInlineSnapshot(`
      "query MyQuery{myQueryField}
      mutation MyMutation{myMutationField}"
    `);
    });
    it("prints minified with comments", () => {
      expect(print(nodes, { minified: true, preserveComments: true }))
        .toMatchInlineSnapshot(`
        "#block comment 1
        query MyQuery{myQueryField}
        #block comment 2
        #block comment 3
        mutation MyMutation{myMutationField}
        #block comment 4"
      `);
    });
  });

  describe("printing with a maximum line length", () => {
    const q = `
    query MyQuery($myVariable1: Int, $myVariable2: String) {
      myField(myArg1: 42, myArg2: "my loooooooooong string")
    }
  `;
    const node = parse(q);
    it("should not break with a value of 56", () => {
      expect(print(node, { maxLineLength: 56 })).toMatchInlineSnapshot(`
      "query MyQuery($myVariable1: Int, $myVariable2: String) {
        myField(myArg1: 42, myArg2: \\"my loooooooooong string\\")
      }
      "
    `);
    });
    it("should break with a value of 55", () => {
      expect(print(node, { maxLineLength: 55 })).toMatchInlineSnapshot(`
      "query MyQuery(
        $myVariable1: Int
        $myVariable2: String
      ) {
        myField(
          myArg1: 42
          myArg2: \\"my loooooooooong string\\"
        )
      }
      "
    `);
    });
  });
});
