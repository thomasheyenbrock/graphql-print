import type { ASTNode } from "graphql";
import type { Location } from "graphql/language/ast";

type ASTReducer<R> = {
  readonly [NodeT in ASTNode as NodeT["kind"]]: ASTReducerFn<NodeT, R>;
};

type ASTReducerFn<Node extends ASTNode, Return> = (
  node: TransformedNode<Node, Return>
) => Return;

type TransformedNode<Node, Return> = {
  [Key in keyof Node]: TransformedField<Node[Key], Return>;
};

type TransformedField<Field, Return> = Field extends
  | undefined
  | null
  | boolean
  | number
  | string
  | Location
  ? Field
  : Field extends ReadonlyArray<unknown>
  ? ReadonlyArray<Return>
  : Return;

export function visit<Return>(
  root: ASTNode,
  visitors: ASTReducer<Return>
): Return {
  const stack: StackItem<Return>[] = [
    { v: false, i: root, k: null, e: [], p: null },
  ];

  let returnValue = root as unknown as Return;

  do {
    const stackItem = stack[0].v
      ? (stack.shift() as StackItem<Return>)
      : stack[0];

    if (!stackItem.v) {
      stackItem.v = true;

      const { i: item } = stackItem;

      if (Array.isArray(item)) {
        for (let i = item.length - 1; i >= 0; i--)
          stack.unshift({ v: false, i: item[i], k: i, e: [], p: stackItem });
      } else {
        const updatedItem = item;

        for (const key in updatedItem) {
          if (key !== "loc") {
            const nested = updatedItem[key as keyof ASTNode];
            if (isAstNodeOrList(nested))
              stack.unshift({
                v: false,
                i: nested,
                k: key,
                e: [],
                p: stackItem,
              });
          }
        }
      }
    } else {
      const item = mergeEdits(stackItem.i, stackItem.e);
      const isRoot = stack.length === 0;

      const i = Array.isArray(item)
        ? item
        : (visitors[item.kind] as ASTReducerFn<ASTNode, Return>)(item);
      if (isRoot) returnValue = i as Return;
      if (stackItem.p) stackItem.p.e.push([stackItem.k, i]);
    }
  } while (stack.length > 0);

  return returnValue;
}

function isAstNodeOrList(value: unknown): value is ASTNodeOrList {
  return (typeof value === "object" && value !== null) || Array.isArray(value);
}

function mergeEdits<Return>(
  item: ASTNodeOrList,
  edits: [Key | null, Return | Return[]][]
): TransformedNode<ASTNode, Return> | Return[] {
  if (edits.length === 0)
    return item as TransformedNode<ASTNode, Return> | Return[];

  if (Array.isArray(item)) {
    const copy: Return[] = Array.from({ length: item.length });
    for (const [key, value] of edits) copy[key as number] = value as Return;
    return copy;
  }

  const copy = { ...item } as TransformedNode<ASTNode, Return>;
  for (const [key, value] of edits)
    (copy as Record<string, unknown>)[key as string] = value;
  return copy;
}

type Key = string | number;

type ASTNodeOrList = ASTNode | ASTNode[];

type StackItem<Return> = {
  /** If the item has already been entered ("visited") */
  v: boolean;
  /** The item (single node or list of node) that is visited */
  i: ASTNodeOrList;
  /** The key of the current item in its parent */
  k: Key | null;
  /** The parent item */
  p: StackItem<Return> | null;
  /** The list of edits to  */
  e: [Key | null, Return | Return[]][];
};
