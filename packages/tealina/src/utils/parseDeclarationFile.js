//@ts-check
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { DocKind } from '@tealina/doc-types'
import ts from 'typescript'

/**
 *
 * @typedef {import('@tealina/doc-types').Entity} Entity
 * @typedef {import('@tealina/doc-types').DocNode } DocNode
 * @typedef {import('@tealina/doc-types').Kind} Kind
 * @typedef {import('@tealina/doc-types').DocItem } DocItem
 * @typedef {import('@tealina/doc-types').EnumEntity } EnumEntity
 */

/**@type {Record<number,Entity>} */
const Refs = {}

/**@type {Record<number,EnumEntity>} */
const EnumRefs = {}

/**@type {Record<number,{name:string,elements:DocNode[]}>} */
const TupleRefs = {}

/**@type {number[]} */
const ParsingTupleIds = []

/**@type {Record<number,number>} */
const RecursiveTupleIds = {}

/**@type {number[]} */
const ParsingEntityIds = []

/**@type {Record<number,string>} */
const memoObj = {}
/**@type {ts.TypeChecker} */
let checker

/**
 * @param {number} a
 * @param {number} b
 */
const isCompatible = (a, b) => (a | b) == Math.max(a, b)

/**
 *  if false,return empty object
 * @param {ts.Symbol} symbol
 * @returns {Pick<Kind,'isOptional'>}
 */
const getOptionalInfo = symbol => {
  // @ts-ignore
  // const isOptional = symbol.questionMark != null
  const isOptional = symbol.flags & ts.SymbolFlags.Optional
  return isOptional ? { isOptional: true } : {}
}

/**
 * @param {ts.UnionTypeNode} typeNode
 */
const parseUnionType = typeNode => {
  const types = typeNode.types.map(t => parseType(checker.getTypeAtLocation(t)))
  return {
    kind: DocKind.Union,
    types,
  }
}

/**
 * @param {ReadonlyArray<any>|string} xs
 */
const isEmptyList = xs => xs.length < 1

/**
 * @param {ts.Symbol} s
 */
const getJsDoc = s => {
  if (isEmptyList(s.declarations ?? [])) return
  // @ts-ignore
  const docTags = ts.getJSDocTags(s.declarations[0])
  if (isEmptyList(docTags)) return
  const kvs = docTags.map(d => [d.tagName.text, d.comment?.slice(1, -1)])
  return Object.fromEntries(kvs)
}

/**
 * @param {ts.Symbol} s
 */
const getTypeInfoFromSymbol = s => {
  // @ts-ignore
  const typeNode = s?.valueDeclaration?.type ?? s.type
  const isUniouNode = typeNode && ts.isUnionTypeNode(typeNode)
  const t = checker.getTypeOfSymbol(s)
  // when {prop:'string' | null}, t.isUnion() is false
  return !t.isUnion() && isUniouNode ? parseUnionType(typeNode) : parseType(t)
}

/** @param {ts.Symbol} s*/
const parseProp = s => ({
  ...getTypeInfoFromSymbol(s),
  ...getOptionalInfo(s),
  name: s.getName(),
  comment: getCommentFromSymbol(s),
  jsDoc: getJsDoc(s),
})

/**
 *  @param {ts.Symbol} s
 * @returns {Record<string, Record<string,DocItem> >}
 */
const parseFirstLevel = s => {
  // @ts-ignore
  const type = checker.getTypeOfSymbol(s)
  // @ts-ignore
  const props = type.getProperties().map(p => [p.getName(), parseApi(p)])
  return Object.fromEntries(props)
}

/**
 * @param {ts.Symbol} s
 * @returns {Record<string,DocItem>}
 */
const parseApi = s => {
  const type = checker.getTypeOfSymbol(s)
  const props = type.getProperties()
  // @ts-ignore
  const impType = checker.getTypeAtLocation(s.getDeclarations()[0])
  // @ts-ignore
  const target = impType.resolvedTypeArguments[0]
  if (target.members == null) {
    // @ts-ignore
    const fileName = s.getDeclarations()[0].getSourceFile().fileName
    throw new Error(
      [
        'Prop ',
        `[${s.escapedName}]`,
        'does not conform to the convention.',
        '\nExport symbol not found',
        '\n error at file: ',
        fileName,
      ].join(''),
    )
  }
  const exportSymbol = target.members.get('default')
  const handlerSymbol = getHandlerSymbol(exportSymbol.declarations[0])
  const comment = getCommentFromSymbol(handlerSymbol)
  const jsDoc = getJsDoc(handlerSymbol)
  const keyValues = props.map(p => [
    p.getName(),
    parseType(checker.getTypeOfSymbol(p)),
  ])
  const payload = Object.fromEntries(keyValues)
  return { ...payload, comment, jsDoc }
}

const makeEnumValueParser =
  (pre = 0) =>
  // @ts-ignore
  mt => {
    const symbol = mt.symbol
    if ('value' in mt) {
      if (isCompatible(ts.TypeFlags.NumberLiteral, mt.flags)) {
        pre = mt.value
        return { kind: DocKind.NumberLiteral, value: mt.value }
      }
      return {
        kind: DocKind.StringLiteral,
        value: mt.value,
      }
    }
    if (symbol.valueDeclaration.initializer == null) {
      return { kind: DocKind.NumberLiteral, value: pre++ }
    }
    const computedType = checker.getTypeAtLocation(
      symbol.valueDeclaration.initializer,
    )
    return parseType(computedType)
  }

/**
 *  @param {ts.EnumType&{id:number,types:ts.Type[]}} t
 */
const recordEnum = t => {
  const { id } = t
  const types = t.types
  const getValue = makeEnumValueParser()
  const members = types.map(mt => ({
    memberId: id,
    key: mt.symbol.getName(),
    value: getValue(mt),
    comment: getCommentFromSymbol(mt.symbol),
  }))
  EnumRefs[id] = {
    name: checker.typeToString(t),
    // @ts-ignore
    members,
    comment: getCommentFromType(t),
  }
  return id
}

/**
 *  @param {ts.Type} t
 *  @param {string} [outerName]
 */
const recordRefs = (t, outerName) => {
  // @ts-ignore
  const id = t.id
  if (ParsingEntityIds.includes(id)) {
    return { kind: DocKind.RecursionEntity, id }
  }
  ParsingEntityIds.push(id)
  Refs[id] = {
    name: outerName ?? checker.typeToString(t),
    // @ts-ignore
    props: t.getApparentProperties().map(parseProp),
    comment: getCommentFromType(t),
  }
  ParsingEntityIds.pop()
  return { kind: DocKind.EntityRef, id }
}

/**
 * @param {ts.Type} t
 */
const propsContainsMethod = t =>
  t
    .getApparentProperties()
    .some(symbol => symbol.flags == ts.SymbolFlags.Method)

/**
 * @param {ts.ObjectType} t
 */
const propsIsEmpty = t => {
  return (
    'declaration' in t &&
    // @ts-ignore
    ts.isMappedTypeNode(t.declaration) &&
    t.aliasSymbol?.name == 'Record'
  )
}

/**
 * @typedef {{
 * match: (t: ts.Type) => boolean;
 * handle: ((t: ts.Type) => DocNode) ;
 * }} Strategy
 * @typedef {{
 * match: (t: ts.Type) => boolean;
 * handle: Strategy[];
 * }} NestStrategy
 * @typedef { Strategy | NestStrategy } StrategyType
 */

/**
 * @type {Strategy[]}
 */
const enumTypeStrategies = [
  {
    // @ts-ignore
    match: t => EnumRefs[t.id],
    // @ts-ignore
    handle: t => ({ kind: DocKind.EnumRef, id: t.id }),
  },
  {
    // @ts-ignore
    match: t => true,
    handle: t => {
      // @ts-ignore
      return { kind: DocKind.EnumRef, id: recordEnum(t) }
    },
  },
]

/**
 * @type {StrategyType[]}
 */
const objTypeStrategies = [
  {
    // @ts-ignore
    match: t => Refs[t.id],
    // @ts-ignore
    handle: t => ({ kind: DocKind.EntityRef, id: t.id }),
  },
  {
    // @ts-ignore
    match: t => memoObj[t.id],
    // @ts-ignore
    handle: t => ({ kind: DocKind.NonLiteralObject, type: memoObj[t.id] }),
  },
  {
    // @ts-ignore
    match: propsIsEmpty,
    handle: t => {
      //only literal key value like Record<string,number>
      // @ts-ignore
      const [keyType, valueType] = t.aliasTypeArguments
      return {
        kind: DocKind.Record,
        key: parseType(keyType),
        value: parseType(valueType),
      }
    },
  },
  {
    match: propsContainsMethod,
    handle: t => {
      const name = checker.typeToString(t)
      // @ts-ignore
      memoObj[t.id] = name
      return { kind: DocKind.NonLiteralObject, type: name }
    },
  },
  {
    // @ts-ignore
    match: t => true,
    handle: t => {
      const name = checker.typeToString(t)
      return recordRefs(t, name)
    },
  },
]

// @ts-ignore
const recordTuple = (t, elements) => {
  if (TupleRefs[t.id]) return
  TupleRefs[t.id] = {
    name: (t.aliasSymbol ?? t.symbol).name,
    elements,
  }
}
/**
 * @type {StrategyType[]}
 */
const typeParseStrategies = [
  {
    match: t => ts.TypeFlags.Never == t.flags,
    // @ts-ignore
    handle: t => ({ kind: DocKind.Never }),
  },
  {
    match: t => checker.isArrayType(t),
    handle: t => ({
      kind: DocKind.Array,
      // @ts-ignore
      element: parseType(checker.getIndexTypeOfType(t)),
    }),
  },
  {
    // @ts-ignore
    match: t => t.intrinsicName != null,
    handle: t => ({
      kind: DocKind.Primitive,
      // @ts-ignore
      type: t.intrinsicName,
    }),
  },
  {
    match: t => ts.TypeFlags.StringLiteral == t.flags,
    // @ts-ignore
    handle: t => ({ kind: DocKind.StringLiteral, value: t.value }),
  },
  {
    match: t => ts.TypeFlags.NumberLiteral == t.flags,
    // @ts-ignore
    handle: t => ({ kind: DocKind.NumberLiteral, value: t.value }),
  },
  {
    match: t => t.isUnion(),
    handle: [
      {
        match: t => t.symbol == null,
        // @ts-ignore
        handle: t => ({
          kind: DocKind.Union,
          // @ts-ignore
          types: t.types.map(parseType),
        }),
      },
      {
        match: t =>
          t.symbol.flags == ts.SymbolFlags.Enum ||
          t.symbol.flags == ts.SymbolFlags.RegularEnum ||
          t.symbol.flags == ts.SymbolFlags.ConstEnum,
        // @ts-ignore
        handle: enumTypeStrategies,
      },
    ],
  },
  {
    match: t => t.isIntersection(),
    handle: recordRefs,
  },
  {
    match: t => checker.isTupleType(t),
    handle: t => {
      // @ts-ignore
      const tid = t.id
      const hasId = tid != null
      if (hasId) {
        // @ts-ignore
        if (ParsingTupleIds.includes(t.id)) {
          // recursive in deep
          RecursiveTupleIds[tid] = (RecursiveTupleIds[tid] ?? 0) + 1
          return { kind: DocKind.RecursionTuple, id: tid }
        }
        // @ts-ignore
        ParsingTupleIds.push(t.id)
      }
      /**@type {ts.Type[]} */
      // @ts-ignore
      const types = t.typeArguments
      // @ts-ignore
      const elements = types.map(v => {
        // @ts-ignore
        const id = v.id
        if (id != null && id == tid) {
          RecursiveTupleIds[tid] = (RecursiveTupleIds[tid] ?? 0) + 1
          return { kind: DocKind.RecursionTuple, id }
        }
        return parseType(v)
      })
      if (hasId) {
        ParsingTupleIds.pop()
        if (RecursiveTupleIds[tid]) {
          recordTuple(t, elements)
          delete RecursiveTupleIds[tid]
        }
      }
      return {
        kind: DocKind.Tuple,
        elements,
      }
    },
  },
  // @ts-ignore
  { match: t => ts.TypeFlags.Object == t.flags, handle: objTypeStrategies },
  {
    match: t => 'checkType' in t,
    handle: t => {
      const x = checker.getBaseConstraintOfType(t)
      // @ts-ignore
      const v = parseType(x)
      return v
    },
  },
  {
    match: t => t.symbol.flags == ts.SymbolFlags.EnumMember,
    handle: t => {
      const parentType = checker.getTypeAtLocation(
        // @ts-ignore
        t.symbol.parent.valueDeclaration,
      )
      const strategy = findStrategy(enumTypeStrategies, parentType)
      strategy.handle(parentType)
      return {
        kind: DocKind.EnumMemberRef,
        // @ts-ignore
        enumId: parentType.id,
        // @ts-ignore
        memberId: t.freshType.id,
      }
    },
  },
]

/**
 * @param {StrategyType[]} strategies
 * @param {ts.Type} t
 * @returns {Strategy}
 */
const findStrategy = (strategies, t) => {
  const strategy = strategies.find(s => s.match(t))
  if (strategy == null) {
    throw new Error(`Unresovled type: ${checker.typeToString(t)}`)
  }
  // @ts-ignore
  return Array.isArray(strategy.handle)
    ? findStrategy(strategy.handle, t)
    : strategy
}

/**
 * @param {ts.Type} t
 */
const parseType = t => {
  const strategy = findStrategy(typeParseStrategies, t)
  return strategy.handle(t)
}

/**
 * @param {ts.Type} type
 */
const getCommentFromType = type => {
  if (type.symbol == null) return
  const symbol = type.aliasSymbol
    ? // @ts-ignore
      type.aliasSymbol.declarations[0].symbol
    : type.getSymbol()
  const comment = getCommentFromSymbol(symbol)
  return comment
}

/**
 * @param {ts.Symbol} symbol
 */
const getCommentFromSymbol = symbol => {
  const rawDocument = symbol.getDocumentationComment(checker)
  const txtDoc = ts.displayPartsToString(rawDocument)
  return isEmptyList(txtDoc) ? void 0 : txtDoc
}

/**
 * @param {ts.ExportAssignment} exportAssignment
 * @returns {ts.Symbol}
 */
const getHandlerSymbol = exportAssignment => {
  try {
    //any lines below may error, tread them all as handler export error
    let idname = exportAssignment.expression.getText()
    const sourceFile = exportAssignment.getSourceFile()
    if (ts.isCallExpression(exportAssignment.expression)) {
      const [lastArgument] = exportAssignment.expression.arguments.slice(-1)
      idname = lastArgument.getText()
    }
    // @ts-ignore
    const symbol = sourceFile.locals.get(idname)
    const { initializer } = symbol.valueDeclaration
    if (
      ts.isArrowFunction(initializer) ||
      ts.isFunctionExpression(initializer)
    ) {
      return symbol
    }
    const { expression } = initializer
    if (expression == null || !ts.isArrayLiteralExpression(expression)) {
      throw 'Export default should be a function, or functions in readonly array'
    }
    const lastEl = expression.elements.at(-1)
    // @ts-ignore
    const lastSymbol = sourceFile.locals.get(lastEl.getText())
    return lastSymbol
  } catch (error) {
    throw new Error(
      [
        String(error),
        `unsolve file: ${exportAssignment.getSourceFile().fileName} `,
      ].join('\n'),
    )
  }
}

/**
 * get the first exported type declaration
 * @param {import('typescript').SourceFile} sourceFile
 * @returns {Record<string,Record<string,DocItem>>}
 */
const parseApiTypeInfo = sourceFile => {
  const exp = sourceFile.statements.find(
    // @ts-ignore
    v => (v.modifiers ?? []).some(v => v.kind == ts.SyntaxKind.ExportKeyword),
  )
  // @ts-ignore
  const type = checker.getTypeAtLocation(exp)
  const list = type.getProperties()
  /** * @param {ts.Symbol} s */
  const ps = list.map(p => [p.getName(), parseFirstLevel(p)])
  return Object.fromEntries(ps)
}

/**
 * @param {ReadonlyArray<T>} xs
 * @param {(x:T)=>boolean} predicate
 * @returns {T|null}
 * @template T
 */
const findFormLast = (xs, predicate) => {
  for (let index = xs.length - 1; index > -1; index--) {
    if (predicate(xs[index])) {
      return xs[index]
    }
  }
  return null
}

/**
 * @param {{entries:string[],tsconfigPath:string}} param0
 * @returns {import('@tealina/doc-types').ApiDoc}
 * ref https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
export const parseDeclarationFile = ({ entries, tsconfigPath }) => {
  const parsedConfig = ts.readConfigFile(tsconfigPath, p =>
    readFileSync(p).toString(),
  )
  if (parsedConfig.error) {
    throw new Error(
      parsedConfig?.error?.messageText.toString() ??
        `Error when parseing ${tsconfigPath}`,
    )
  }
  const program = ts.createProgram(entries, parsedConfig.config)
  checker = program.getTypeChecker()
  const sourceFiles = program.getSourceFiles()
  const entryFileName = entries[0].split(path.sep).join('/')
  const entrySourceFile = findFormLast(
    sourceFiles,
    v => v.fileName == entryFileName,
  )
  // @ts-ignore
  const apis = parseApiTypeInfo(entrySourceFile)
  return {
    apis,
    entityRefs: Refs,
    enumRefs: EnumRefs,
    tupleRefs: TupleRefs,
  }
}
