import { MacCommandOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { type Action, KBarAnimator, KBarPortal, KBarPositioner, KBarProvider, KBarResults, KBarSearch, useKBar, useMatches, useRegisterActions } from "kbar";
import { type ReactNode, useMemo } from "react";
import { curShowApiAtom } from "../atoms/jsonSourceAtom";
import { apiSummariesAtom } from "../atoms/summaryAtom";

// type SummaryKeys = keyof SearchDataModel
// const fields: SummaryKeys[] = ['endpoint', 'description', 'method']

export function DocSearchProvider({ children }: { children: ReactNode }) {
  return (
    <KBarProvider
      options={{
        enableHistory: true,
        toggleShortcut: "$mod+k",
      }}
    >
      <KBarPortal>
        <RegisterActions />

        <KBarPositioner className="bg-black/60">
          <KBarAnimator className="w-50% dark:bg-[#101010] bg-white rounded-md px-4 py-2">
            <div className="py-1 px-1">
              <KBarSearch className="w-full  border-b-solid dark:border-white/45 border-b-1px rounded-none! border-b-black/45  bg-transparent border-none outline-none 
              dark:text-white/85 text-black/85 indent-sm rounded-sm px-0 py-2 mb-3 text-lg  
            placeholder-black/45   dark:placeholder-white/45 " />
            </div>
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  )
}

function RegisterActions() {
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
  useRegisterActions(actions)
  return null
}
// 2. 渲染搜索结果
function RenderResults() {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results.slice(0, 6)}
      onRender={({ item, active }) => (
        <div className="py-1 px-1">
          <div className={`px-4 py-3 rounded-sm flex items-center outline-solid 
             ${active ? 'outline-indigo-6 text-indigo-6 dark:text-indigo! dark:outline-indigo!'
              : ' outline-black/50 dark:outline-white/25 text-black/75 dark:text-white/75 '}
             `}>
            {typeof item === "string" ? (
              <div>{item}</div>
            ) : (
              <div>
                {item.name}
              </div>
            )}
          </div>
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