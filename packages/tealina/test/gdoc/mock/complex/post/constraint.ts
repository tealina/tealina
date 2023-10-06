import { FuncAPI } from '../../apiUtility.js'

type InternalArgs<
  R = {
    [K in string]: {
      [K in string]: unknown
    }
  },
  M = {
    [K in string]: {
      [K in string]: unknown
    }
  },
  Q = {
    [K in string]: {
      [K in string]: unknown
    }
  },
  C = {
    [K in string]: unknown
  },
> = {
  result: {
    [K in keyof R]: {
      [P in keyof R[K]]: () => R[K][P]
    }
  }
  model: {
    [K in keyof M]: {
      [P in keyof M[K]]: () => M[K][P]
    }
  }
  query: {
    [K in keyof Q]: {
      [P in keyof Q[K]]: () => Q[K][P]
    }
  }
  client: {
    [K in keyof C]: () => C[K]
  }
}

type GetSelect<
  Base extends Record<any, any>,
  R extends InternalArgs['result'][string],
  KR extends keyof R = string extends keyof R ? never : keyof R,
> = {
  [K in KR | keyof Base]?: K extends KR ? boolean : Base[K]
}

type UserSelect<ExtArgs extends InternalArgs = DefaultArgs> = GetSelect<
  {
    id?: boolean
    email?: boolean
    name?: boolean
  },
  ExtArgs['result']['user']
>

interface RuntimeFieldRef<Model, FieldType> {
  readonly modelName: Model
  readonly name: string
  readonly typeName: FieldType
  readonly isList: boolean
}

type FieldRef<Model, FieldType> = RuntimeFieldRef<Model, FieldType>

type FieldRefInputType<Model, FieldType> = Model extends never
  ? never
  : FieldRef<Model, FieldType>

type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>

type StringFieldRefInput<$PrismaModel> = FieldRefInputType<
  $PrismaModel,
  'String'
>

type StringFilter<$PrismaModel = never> = {
  equals?: string | StringFieldRefInput<$PrismaModel>
  in?: string[]
  notIn?: string[]
  lt?: string | StringFieldRefInput<$PrismaModel>
  lte?: string | StringFieldRefInput<$PrismaModel>
  gt?: string | StringFieldRefInput<$PrismaModel>
  gte?: string | StringFieldRefInput<$PrismaModel>
  contains?: string | StringFieldRefInput<$PrismaModel>
  startsWith?: string | StringFieldRefInput<$PrismaModel>
  endsWith?: string | StringFieldRefInput<$PrismaModel>
}

type IntFilter<$PrismaModel = never> = {
  equals?: number | IntFieldRefInput<$PrismaModel>
  in?: number[]
  notIn?: number[]
  lt?: number | IntFieldRefInput<$PrismaModel>
  lte?: number | IntFieldRefInput<$PrismaModel>
  gt?: number | IntFieldRefInput<$PrismaModel>
  gte?: number | IntFieldRefInput<$PrismaModel>
}

type UserWhereInput = {
  AND?: UserWhereInput | UserWhereInput[]
  OR?: UserWhereInput[]
  NOT?: UserWhereInput | UserWhereInput[]
  id?: IntFilter<'User'> | number
  email?: StringFilter<'User'> | string
}

type DefaultArgs = InternalArgs<{}, {}, {}, {}>

interface ModelFindManyArgs<ExtArgs extends InternalArgs = DefaultArgs> {
  select?: UserSelect<ExtArgs> | null
  where?: UserWhereInput
}

/**
 * recursion entity
 */
const handler: FuncAPI<ModelFindManyArgs, any[]> = () => {}

export default handler
