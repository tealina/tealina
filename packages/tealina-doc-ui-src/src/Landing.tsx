import { RightOutlined } from "@ant-design/icons";
import { Button, Form, Input, Layout, Typography, type InputRef } from "antd";
import { useSetAtom } from "jotai";
import { useRef, useState } from "react";
import { authAtom } from "./atoms/authAtom";
import { setHeadersForAuth } from "./atoms/jsonSourceAtom";

export function LandingPage() {
  const inputRef = useRef<InputRef>(null)
  const [err, setErr] = useState<string | null>(null)
  const setAuth = useSetAtom(authAtom)
  const handlerSubmit = async () => {
    const value = inputRef.current!.input?.value
    if (value == null) {
      setErr('Please enter a password')
      return
    }
    const { loginURL, authenticationWay } = window.TEALINA_VDOC_CONFIG.security!
    const result = await fetch(loginURL, {
      body: JSON.stringify({ password: value }), method: 'POST', headers: {
        'Content-Type': 'application/json'
      }
    })
    if (result.status != 200) {
      const text = await result.text().then((x) => x ?? result.statusText, () => result.statusText)
      setErr(`Validation API error:\n ${text}`)
      return
    }
    if (authenticationWay === 'headers') {
      const headers = await result.json()
      setHeadersForAuth(headers)
    }
    window.addEventListener('beforeunload', function () {
      const { logoutURL } = window.TEALINA_VDOC_CONFIG.security ?? {}
      if (logoutURL) {
        window.navigator.sendBeacon(logoutURL)
      }
    })
    setAuth(s => ({ ...s, isValidated: true }))
  }
  return <Layout className="flex items-center justify-center h-screen w-screen">
    <div>
      <Form onFinish={handlerSubmit}>
        <Typography.Title className="text-center ">Enter Password</Typography.Title>
        <div className="text-center">
          <Input className="max-w-70 w-70" placeholder="password"
            suffix={<Button htmlType="submit" icon={<RightOutlined />} />} ref={inputRef} />
        </div>
      </Form>
      <div className="p1 text-red-5 whitespace-pre-wrap">{err}</div>
    </div>
  </Layout>
}