/**
 * Domain shapes used by the demo handlers. They sit in their own module so the
 * documentation generator sees named interfaces rather than anonymous object types.
 */
export namespace Pure {
  interface User {
    /** @default {autoincrement()} */
    id: number
    /** the email, should be unique */
    email: string
    /** the user name */
    name: string | null
    skills: Skills
  }

  interface UserCreateInput {
    /** @default {autoincrement()} */
    id?: number
    /** the email, should be unique */
    email: string
    /** the user name */
    name?: string
    skills: Skills
  }

  interface UserUpdateInput {
    /** @default {autoincrement()} */
    id?: number
    /** the email, should be unique */
    email?: string
    /** the user name */
    name?: string | null
    skills?: Skills
  }

  /**
   * Enums
   */
  // https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
  export const Skills: {
    Node: 'Node'
    React: 'React'
    Typescript: 'Typescript'
  }
  export type Skills = (typeof Skills)[keyof typeof Skills]
}
