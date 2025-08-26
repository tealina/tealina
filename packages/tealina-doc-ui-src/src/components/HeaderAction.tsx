import { SettingOutlined } from '@ant-design/icons'
import { Button, Modal, Select } from 'antd'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import {
  curJsonSourceAtom,
  curShowApiAtom,
  jsonSourceAtom,
} from '../atoms/jsonSourceAtom'
import { themeAtom } from '../atoms/themeAtom'
import { ComonFields } from './features/playground/CommonFields'
import { MoonIcon } from './icon/MoonIcon'
import { SunIcon } from './icon/SunIcon'
import { SearchBtn } from './Search'

const isPlaygroundEnable =
  window.TEALINA_VDOC_CONFIG.features?.playground != null

export function HeaderAction() {
  const jsonSources = useAtomValue(jsonSourceAtom)
  const setCurSource = useSetAtom(curJsonSourceAtom)
  const setCurShowApi = useSetAtom(curShowApiAtom)
  const options = jsonSources.map(v => ({
    label: v.name ?? v.jsonURL,
    value: v.jsonURL,
  }))

  return (
    <div className="fixed z-3 flex justify-end gap-3 p-2 top-0 right-0 items-center pt-3">
      <SearchBtn />
      <ThemeToggle />
      <Select
        className="min-w-30"
        defaultValue={jsonSources[0].jsonURL}
        options={options}
        onChange={value => {
          const target = jsonSources.find(v => v.jsonURL === value)
          if (target != null) {
            setCurShowApi(null)
            setCurSource(target)
          }
        }}
      />
      {isPlaygroundEnable && <CommonFieldToggle />}
    </div>
  )
}

function CommonFieldToggle() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onCancel={() => {
          setOpen(false)
        }}
        title="Preset commond fields"
        footer={null}
      >
        <ComonFields
          onSaved={() => {
            setOpen(false)
          }}
        />
      </Modal>
    </>
  )
}

function ThemeToggle() {
  const [mode, setThemeMode] = useAtom(themeAtom)
  const isDark = mode === 'dark'
  return (
    <div
      className="rounded-full border w-15 border-solid relative flex items-center h-7"
      style={{
        borderColor: isDark ? '#424242' : '#d9d9d9',
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        setThemeMode(isDark ? 'light' : 'dark')
      }}
    >
      <div
        className="w-5 h-[22px] absolute left-2 animate-slide-to-right animate-fill-forwards animate-duration-200"
        style={{ display: isDark ? 'none' : 'initial' }}
      >
        <SunIcon />
      </div>
      <div
        className="w-5 h-[22px] absolute right-2 animate-slide-to-left animate-fill-forwards animate-duration-200"
        style={{ display: isDark ? 'initial' : 'none' }}
      >
        <MoonIcon />
      </div>
    </div>
  )
}
