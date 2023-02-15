import benchmark from "benchmark";
import { parse, print } from "graphql";
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ref = process.argv[2];

const __dirname = new URL(import.meta.url).pathname
  .split("/")
  .slice(0, -1)
  .join("/");

const KITCHEN_SINK = parse(
  readFileSync(join(__dirname, "utils", "kitchenSink.gql"), "utf8")
);

async function main() {
  execSync("pnpm build");
  execSync("cp -r dist dist-new");

  execSync(ref ? `git checkout ${ref}` : "git stash");
  execSync("pnpm build");

  const sizeOld = statSync(join(__dirname, "../dist/index.js")).size;
  const sizeNew = statSync(join(__dirname, "../dist-new/index.js")).size;
  console.log("old x " + sizeOld.toLocaleString() + " bytes");
  console.log("new x " + sizeNew.toLocaleString() + " bytes");
  console.log((sizeNew < sizeOld ? "new" : "old") + " is smaller\n");

  const { print: printOld } = await import(
    join(__dirname, "../dist/index.mjs")
  );
  const { print: printNew } = await import(
    join(__dirname, "../dist-new/index.mjs")
  );

  const prettyWithoutComments = new benchmark.Suite("pretty without comments");
  prettyWithoutComments
    .add("old", () => printOld(KITCHEN_SINK))
    .add("new", () => printNew(KITCHEN_SINK))
    .on("cycle", (event) => {
      console.log("" + prettyWithoutComments.name + " x " + event.target);
    })
    .on("complete", () => {
      console.log(
        prettyWithoutComments.filter("fastest").map("name") + " is faster\n"
      );
    })
    .run();

  const prettyWithComments = new benchmark.Suite("pretty with comments");
  prettyWithComments
    .add("old", () => printOld(KITCHEN_SINK, { preserveComments: true }))
    .add("new", () => printNew(KITCHEN_SINK, { preserveComments: true }))
    .on("cycle", (event) => {
      console.log("" + prettyWithComments.name + " x " + event.target);
    })
    .on("complete", () => {
      console.log(
        prettyWithComments.filter("fastest").map("name") + " is faster\n"
      );
    })
    .run();

  const minifiedWithoutComments = new benchmark.Suite(
    "minified without comments"
  );
  minifiedWithoutComments
    .add("old", () => printOld(KITCHEN_SINK, { minified: true }))
    .add("new", () => printNew(KITCHEN_SINK, { minified: true }))
    .on("cycle", (event) => {
      console.log("" + minifiedWithoutComments.name + " x " + event.target);
    })
    .on("complete", () => {
      console.log(
        minifiedWithoutComments.filter("fastest").map("name") + " is faster\n"
      );
    })
    .run();

  const minifiedWithComments = new benchmark.Suite("minified with comments");
  minifiedWithComments
    .add("old", () =>
      printOld(KITCHEN_SINK, { minified: true, preserveComments: true })
    )
    .add("new", () =>
      printNew(KITCHEN_SINK, { minified: true, preserveComments: true })
    )
    .on("cycle", (event) => {
      console.log("" + minifiedWithComments.name + " x " + event.target);
    })
    .on("complete", () => {
      console.log(
        minifiedWithComments.filter("fastest").map("name") + " is faster\n"
      );
    })
    .run();

  const graphqljs = new benchmark.Suite("graphql-js");
  graphqljs
    .add("graphql-js", () => print(KITCHEN_SINK))
    .add("graphql-print", () => printNew(KITCHEN_SINK))
    .on("cycle", (event) => {
      console.log("" + event.target);
    })
    .on("complete", () => {
      console.log(graphqljs.filter("fastest").map("name") + " is faster\n");
    })
    .run();

  execSync(ref ? "git checkout main" : "git stash pop");
  execSync("rm -r dist-new");
}

main();
