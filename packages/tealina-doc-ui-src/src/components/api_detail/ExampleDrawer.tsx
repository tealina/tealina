import { Button, Card, Drawer, Typography } from "antd";
import { atom, useAtom, useSetAtom } from "jotai";
import { JsonView } from "../monaco/JsonView";
import { DocItem } from "@tealina/doc-types";
import { DocDataKeys } from "@tealina/utility-types";

export type ExampleValueType = NonNullable<DocItem['examples']>[DocDataKeys]
export const exampleAtom = atom<ExampleValueType | null | undefined>(null)
export const exampleTitleAtom = atom<string | null>(null)
export function ExampleDrawer() {
  const [example, setExample] = useAtom(exampleAtom)
  const [title, setDrawerTitle] = useAtom(exampleTitleAtom)
  return <Drawer title={title} open={title != null} placement="right" width="40vw" mask={false} onClose={() => {
    setExample(null)
    setDrawerTitle(null)
  }}>
    {example == null
      ? <Typography>No Examples</Typography>
      : <div className="flex flex-col gap-5">
        <ExampleCard example={example} />
      </div>
    }
  </Drawer >
}



function ExampleCard({ example }: { example: ExampleValueType }) {
  if (example == null) {
  }
  if (Array.isArray(example)) {
    return <>
      {example.map(item => <Card title={item.key} key={item.key}>
        <Typography>{item.summary}</Typography>
        <JsonView value={JSON.stringify(item.value, (_key, value) => value === undefined ? 'undefined' : value, 2)} language="json" />
      </Card>)}
    </>
  }
  return <Card>
    <JsonView value={JSON.stringify(example, (_key, value) => value === undefined ? 'undefined' : value, 2)} language="json" />
  </Card>
}

export function ExapmleBtn({ exampleItem, title }: { exampleItem?: ExampleValueType, title: string }) {
  const setExample = useSetAtom(exampleAtom)
  const setDrawerTitle = useSetAtom(exampleTitleAtom)
  if (exampleItem == null) return null
  return <Button onClick={() => {
    setExample(exampleItem)
    setDrawerTitle(title)
  }}>Examples</Button>
}