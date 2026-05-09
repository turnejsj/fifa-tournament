declare module "papaparse" {
  export interface ParseMeta {
    fields?: string[]
  }
  export interface ParseResult<T> {
    data: T[]
    errors: { message?: string }[]
    meta: ParseMeta
  }
  export interface PapaStatic {
    parse<T>(
      csv: string,
      config?: {
        header?: boolean
        skipEmptyLines?: boolean
        transformHeader?: (header: string) => string
      }
    ): ParseResult<T>
  }
  const Papa: PapaStatic
  export default Papa
}
