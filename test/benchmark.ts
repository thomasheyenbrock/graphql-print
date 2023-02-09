import { Event, Suite } from "benchmark";
import { parse } from "graphql";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const KITCHEN_SINK = parse(
  readFileSync(join(__dirname, "utils", "kitchenSink.gql"), "utf8")
);

execSync("cp src/index.ts src/index-new.ts");
execSync("git stash");

const { print: printOld } = require(join(__dirname, "../src/index"));
const { print: printNew } = require(join(__dirname, "../src/index-new"));

const prettyWithoutComments = new Suite("pretty without comments");
prettyWithoutComments
  .add("old", () => printOld(KITCHEN_SINK))
  .add("new", () => printNew(KITCHEN_SINK))
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .on("complete", () => {
    console.log(
      prettyWithoutComments.filter("fastest").map("name") + " is faster"
    );
  })
  .run();

const prettyWithComments = new Suite("pretty with comments");
prettyWithComments
  .add("old", () => printOld(KITCHEN_SINK, { preserveComments: true }))
  .add("new", () => printNew(KITCHEN_SINK, { preserveComments: true }))
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .on("complete", () => {
    console.log(
      prettyWithComments.filter("fastest").map("name") + " is faster"
    );
  })
  .run();

const minifiedWithoutComments = new Suite("minified without comments");
minifiedWithoutComments
  .add("old", () => printOld(KITCHEN_SINK, { minified: true }))
  .add("new", () => printNew(KITCHEN_SINK, { minified: true }))
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .on("complete", () => {
    console.log(
      minifiedWithoutComments.filter("fastest").map("name") + " is faster"
    );
  })
  .run();

const minifiedWithComments = new Suite("minified with comments");
minifiedWithComments
  .add("old", () =>
    printOld(KITCHEN_SINK, { minified: true, preserveComments: true })
  )
  .add("new", () =>
    printNew(KITCHEN_SINK, { minified: true, preserveComments: true })
  )
  .on("cycle", (event: Event) => {
    console.log(String(event.target));
  })
  .on("complete", () => {
    console.log(
      minifiedWithComments.filter("fastest").map("name") + " is faster"
    );
  })
  .run();

execSync("git stash pop");
execSync("rm src/index-new.ts");
