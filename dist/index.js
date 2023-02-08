"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  print: () => print,
});
module.exports = __toCommonJS(src_exports);

// src/print.ts
var import_graphql = require("graphql");
function print(ast, options = {}) {
  return printAST(ast, options);
}
function printAST(
  ast,
  {
    indentationStep = "  ",
    maxLineLength = 80,
    preserveComments = false,
    pretty = false,
  }
) {
  const SPACE = pretty ? " " : "";
  const list = (0, import_graphql.visit)(ast, {
    Name: { leave: (node) => [node.value] },
  });
  let printed = "";
  let currentLine = [];
  let indentation = "";
  function handleIndentation(i) {
    if (i === "+") indentation += indentationStep;
    if (i === "-") indentation = indentation.slice(indentationStep.length);
  }
  function printLine(list2, breakLines) {
    let printed2 = "";
    for (let i = 0; i < list2.length; i++) {
      const item = list2[i];
      if (typeof item === "string") {
        printed2 += item;
      } else if (item.type === "soft_line") {
        if (breakLines) {
          handleIndentation(item.indentation);
          printed2 += "\n" + indentation + item.prefix;
        } else {
          printed2 += item.alt;
        }
      }
    }
    return printed2;
  }
  function printCurrentLine() {
    const printedLine = printLine(currentLine, false);
    if (!pretty || printedLine.length <= maxLineLength) {
      printed += printedLine;
    } else {
      printed += printLine(currentLine, true);
    }
    currentLine = [];
  }
  for (const item of list.flat()) {
    if (typeof item === "object" && item.type === "hard_line") {
      printCurrentLine();
      handleIndentation(item.indentation);
      printed += "\n" + indentation;
    } else {
      currentLine.push(item);
    }
  }
  printCurrentLine();
  return printed.replace(/^\n*/, "").replace(/\n*$/, pretty ? "\n" : "");
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    print,
  });
