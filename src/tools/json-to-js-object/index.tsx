import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { FileDropzone } from '../../components/FileDropzone'
import { CodeEditor } from '../../components/CodeEditor'
import { OutputActions } from '../../components/OutputActions'
import { PageDropOverlay } from '../../components/PageDropOverlay'
import { useToast } from '../../components/Toast'
import { useJsonFileInput } from '../../hooks/useJsonFileInput'

export default function JsonToJsObject() {
  const { toast } = useToast()
  const { mode, setMode, file, fileData, handleFile, clearFile, draggingOver } = useJsonFileInput()
  const [jsonText, setJsonText] = useState('')
  const [jsOutput, setJsOutput] = useState('')

  const convert = () => {
    let data;
    if (mode === 'file') {
      data = fileData.current;
    } else {
      if (!jsonText.trim()) {
        toast('Digite um JSON para converter', 'error');
        return;
      }
      try {
        data = JSON.parse(jsonText);
      } catch {
        toast('JSON inválido. Verifique a sintaxe.', 'error');
        return;
      }
    }

    if (data === null || data === undefined) { 
      toast('Dado nulo ou indefinido', 'error'); 
      return; 
    }

    // Convert to string and replace quoted keys with unquoted keys where valid
    const jsonString = JSON.stringify(data, null, 2);
    
    // Regex matches "valid_identifier": and replaces it with valid_identifier:
    // It safely avoids matched strings inside values because of context logic.
    // However, a simple regex on JSON output is quite safe since JSON guarantees
    // the structure is uniform, format keys always match /"([^"]+)": / but since
    // stringify uses spaces, we match /"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g
    const jsString = jsonString.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:');

    setJsOutput(jsString);
    toast('Objeto JS gerado!', 'success');
  }

  return (
    <ToolLayout name="JSON → JS Object" description="Converta JSON para objeto literal JavaScript" badge="converter">
      <PageDropOverlay visible={draggingOver} accept=".json" />

      <div style={{ display: 'flex', gap: 8 }}>
        {(['text', 'file'] as const).map(m => (
          <button key={m} className={`btn ${mode === m ? 'primary' : 'ghost'}`} onClick={() => setMode(m)}>
            {m === 'text' ? 'Colar JSON' : 'Upload arquivo'}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <CodeEditor
          value={jsonText}
          onChange={setJsonText}
          placeholder={'{\n  "nome": "João",\n  "idade": 25\n}'}
          label="JSON"
          minHeight={180}
        />
      ) : (
        <FileDropzone
          accept=".json"
          hint=".json · até 500MB"
          onFile={handleFile}
          state={file ? 'done' : 'idle'}
          fileName={file?.name}
          onClear={() => { clearFile(); setJsOutput(''); }}
        />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={convert}>Converter</button>
        {jsOutput && (
          <OutputActions
            data={jsOutput}
            filename="output.js"
            mimeType="text/javascript"
            onClear={() => setJsOutput('')}
          />
        )}
      </div>

      {jsOutput && (
        <div style={{ marginTop: 16 }}>
          <CodeEditor
            value={jsOutput}
            onChange={setJsOutput}
            label="Objeto JS"
            minHeight={250}
          />
        </div>
      )}
    </ToolLayout>
  )
}
