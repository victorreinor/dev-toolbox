import { useState, useCallback } from 'react'
import { useSubmitOnCmdEnter } from '../../hooks/useSubmitOnCmdEnter'
import { usePageDrop } from '../../hooks/usePageDrop'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useJsonFileInput } from '../../hooks/useJsonFileInput'

type Direction = 'json-to-js' | 'js-to-json'
type Mode = 'text' | 'file'

function jsonToJsObject(data: unknown): string {
  const jsonString = JSON.stringify(data, null, 2)
  return jsonString.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:')
}

function jsObjectToJson(input: string): string {
  const obj = new Function('return (' + input.trim() + ')')()
  return JSON.stringify(obj, null, 2)
}

export default function JsonJsObject() {
  const { toast } = useToast()
  const [direction, setDirection] = useState<Direction>('json-to-js')
  const isJsonToJs = direction === 'json-to-js'

  const [jsMode, setJsMode] = useState<Mode>('text')
  const [jsFile, setJsFile] = useState<File | null>(null)
  const [inputText, setInputText] = useState('')
  const [output, setOutput] = useState('')

  const handleJsFile = useCallback(async (f: File) => {
    setJsMode('file')
    setJsFile(f)
    setInputText(await f.text())
  }, [])

  const clearJsFile = () => {
    setJsFile(null)
    setInputText('')
  }

  const { mode: jsonMode, setMode: setJsonMode, file: jsonFile, fileData, handleFile: handleJsonFile, clearFile: clearJsonFile, draggingOver: jsonDraggingOver } = useJsonFileInput({ disabled: !isJsonToJs })
  const { draggingOver: jsDraggingOver } = usePageDrop({ accept: ['.js', '.ts', '.txt'], onFile: handleJsFile, disabled: isJsonToJs })

  const handleDirectionChange = (d: Direction) => {
    setDirection(d)
    setOutput('')
    setInputText('')
  }

  const convert = () => {
    if (isJsonToJs) {
      let data
      if (jsonMode === 'file') {
        data = fileData.current
      } else {
        if (!inputText.trim()) { toast('Digite um JSON para converter', 'error'); return }
        try { data = JSON.parse(inputText) } catch { toast('JSON inválido. Verifique a sintaxe.', 'error'); return }
      }
      if (data === null || data === undefined) { toast('Dado nulo ou indefinido', 'error'); return }
      setOutput(jsonToJsObject(data))
      toast('Objeto JS gerado!', 'success')
    } else {
      if (!inputText.trim()) { toast('Digite um objeto JS para converter', 'error'); return }
      try {
        setOutput(jsObjectToJson(inputText))
        toast('JSON gerado!', 'success')
      } catch {
        toast('Objeto JS inválido. Verifique a sintaxe.', 'error')
      }
    }
  }

  useSubmitOnCmdEnter(convert)

  const currentMode = isJsonToJs ? jsonMode : jsMode
  const setCurrentMode = isJsonToJs ? setJsonMode : setJsMode
  const draggingOver = isJsonToJs ? jsonDraggingOver : jsDraggingOver

  return (
    <ToolLayout
      name="JSON ↔ JS Object"
      description={isJsonToJs ? 'Converta JSON para objeto literal JavaScript' : 'Converta objeto literal JavaScript para JSON'}
      badge="converter"
    >
      <PageDropOverlay visible={draggingOver} accept={isJsonToJs ? '.json' : '.js · .ts · .txt'} />

      <div className="field">
        <label className="label">Formato</label>
        <div className="radio-group">
          {(['json-to-js', 'js-to-json'] as const).map(d => (
            <label key={d} className={`radio-option ${direction === d ? 'active' : ''}`}>
              <input type="radio" name="direction" value={d} checked={direction === d} onChange={() => handleDirectionChange(d)} />
              {d === 'json-to-js' ? 'JSON → JS Object' : 'JS Object → JSON'}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['text', 'file'] as const).map(m => (
          <button key={m} className={`btn ${currentMode === m ? 'primary' : 'ghost'}`} onClick={() => setCurrentMode(m)}>
            {m === 'text' ? (isJsonToJs ? 'Colar JSON' : 'Colar JS Object') : 'Upload arquivo'}
          </button>
        ))}
      </div>

      {currentMode === 'file' ? (
        isJsonToJs ? (
          <FileDropzone
            accept=".json"
            hint=".json · até 500MB"
            onFile={handleJsonFile}
            state={jsonFile ? 'done' : 'idle'}
            fileName={jsonFile?.name}
            onClear={() => { clearJsonFile(); setOutput('') }}
          />
        ) : (
          <FileDropzone
            accept=".js,.ts,.txt"
            hint=".js · .ts · .txt · até 500MB"
            onFile={handleJsFile}
            state={jsFile ? 'done' : 'idle'}
            fileName={jsFile?.name}
            onClear={() => { clearJsFile(); setOutput('') }}
          />
        )
      ) : (
        <CodeEditor
          value={inputText}
          onChange={setInputText}
          placeholder={isJsonToJs
            ? '{\n  "nome": "João",\n  "idade": 25\n}'
            : '{\n  nome: "João",\n  idade: 25\n}'
          }
          label={isJsonToJs ? 'JSON' : 'JS Object'}
          minHeight={180}
        />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert}>Converter <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.55, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>⌘↵</span></button>
        {output && (
          <OutputActions
            data={output}
            filename={isJsonToJs ? 'output.js' : 'output.json'}
            mimeType={isJsonToJs ? 'text/javascript' : 'application/json'}
            onClear={() => setOutput('')}
          />
        )}
      </div>

      {output && (
        <div style={{ marginTop: 16 }}>
          <CodeEditor
            value={output}
            onChange={setOutput}
            label={isJsonToJs ? 'JS Object' : 'JSON'}
            minHeight={250}
          />
        </div>
      )}
    </ToolLayout>
  )
}
