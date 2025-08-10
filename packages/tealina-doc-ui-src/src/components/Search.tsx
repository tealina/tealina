import { MacCommandOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { type Action, KBarAnimator, KBarPortal, KBarPositioner, KBarProvider, KBarResults, KBarSearch, useKBar, useMatches } from "kbar";
import { type ReactNode, useMemo } from "react";
import { curShowApiAtom } from "../atoms/jsonSourceAtom";
import { apiSummariesAtom } from "../atoms/summaryAtom";

// type SummaryKeys = keyof SearchDataModel
// const fields: SummaryKeys[] = ['endpoint', 'description', 'method']

export function DocSearchProvider({ children }: { children: ReactNode }) {
  const searchDatas = useAtomValue(apiSummariesAtom)
  const setCurShowApi = useSetAtom(curShowApiAtom)
  // const miniSearch = useMemo(() => {
  //   const inst = new MiniSearch({ fields, storeFields: fields })
  //   inst.addAll(searchDatas)
  //   return inst
  // }, [searchDatas])
  const actions = useMemo(() => {
    const acts: Action[] = searchDatas.map((res) => {
      return {
        id: res.endpoint,
        name: res.endpoint,
        keywords: res.endpoint.split('/').join(' '),
        perform: () => {
          setCurShowApi({ method: res.method, path: res.endpoint })
        }
      }
    })
    return acts
  }, [searchDatas, setCurShowApi])
  return (
    <KBarProvider
      actions={actions}
      options={{
        enableHistory: true,
        toggleShortcut: "$mod+k",
      }}
    >
      <KBarPortal>
        <KBarPositioner>
          <KBarAnimator className="w-50% bg-white">
            <KBarSearch />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  )
}

// 2. 渲染搜索结果
function RenderResults() {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results.slice(0, 6)}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div>{item}</div>
        ) : (
          <div
            style={{
              background: active ? "#eee" : "transparent",
              padding: "8px 16px",
            }}
          >
            {item.name}
          </div>
        )
      }
    />
  );
}

export function SearchBtn() {
  const { query } = useKBar()
  return (
    <Button onClick={query.toggle}>
      <SearchOutlined />
      <Tag>
        <MacCommandOutlined />
        <span>K</span>
      </Tag>
    </Button>

  )
}