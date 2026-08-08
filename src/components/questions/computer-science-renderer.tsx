import type {
  ComputerScienceSubjectUnit,
  JsonValue,
  PresentationBlock,
} from "@/lib/generation";

type CircuitGateView = { id: string; operator: string; inputs: string[] };
type CircuitView = {
  inputs: string[];
  gates: CircuitGateView[];
  outputs: Array<{ label: string; signal: string }>;
};
type TableView = { headers: string[]; rows: string[][] };

function object(value: JsonValue): Record<string, JsonValue> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function strings(value: JsonValue | undefined): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function tableData(value: JsonValue): TableView | null {
  if (Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean"))) {
    const width = value[0]?.length ?? 0;
    return { headers: Array.from({ length: width }, (_, index) => `Column ${index + 1}`), rows: value.map((row) => row.map((item) => typeof item === "boolean" ? item ? "T" : "F" : String(item))) };
  }
  const data = object(value);
  if (!data) return null;
  const headers = strings(data.headers) ?? strings(data.variables);
  if (!headers || !Array.isArray(data.rows)) return null;
  const rows = data.rows.map((row) => Array.isArray(row) && row.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean") ? row.map((item) => typeof item === "boolean" ? item ? "T" : "F" : String(item)) : null);
  if (rows.some((row) => row === null)) return null;
  return { headers, rows: rows as string[][] };
}

type DiagramNode = { id: string; label: string };
function genericDiagramData(value: JsonValue): { nodes: DiagramNode[]; edges: Array<{ from: string; to: string; label?: string }> } | null {
  const data = object(value);
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;
  const nodes = data.nodes.map((value) => { const node = object(value); return node && typeof node.id === "string" && typeof node.label === "string" ? { id: node.id, label: node.label } : null; });
  const edges = data.edges.map((value) => { const edge = object(value); return edge && typeof edge.from === "string" && typeof edge.to === "string" ? { from: edge.from, to: edge.to, ...(typeof edge.label === "string" ? { label: edge.label } : {}) } : null; });
  return nodes.some((node) => !node) || edges.some((edge) => !edge) ? null : { nodes: nodes as DiagramNode[], edges: edges as Array<{ from: string; to: string; label?: string }> };
}

function StructuredDiagramRenderer({ data }: { data: NonNullable<ReturnType<typeof genericDiagramData>> }) {
  return <figure className="rounded-lg border border-workspace-border bg-surface-lowest p-4" data-structured-diagram><div className="flex flex-wrap items-center justify-center gap-3">{data.nodes.map((node) => <div className="min-w-32 rounded-md border-2 border-primary bg-surface-low px-4 py-3 text-center font-mono text-sm font-semibold" key={node.id}>{node.label}</div>)}</div><ul className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-on-surface-variant">{data.edges.map((edge, index) => <li className="rounded-full bg-surface-low px-3 py-1.5" key={`${edge.from}-${edge.to}-${index}`}>{edge.from} → {edge.to}{edge.label ? ` · ${edge.label}` : ""}</li>)}</ul><figcaption className="sr-only">Structured relationship diagram with {data.nodes.length} nodes and {data.edges.length} relationships.</figcaption></figure>;
}

function circuitData(value: JsonValue): CircuitView | null {
  const data = object(value);
  if (!data) return null;
  const inputs = strings(data.inputs);
  if (!inputs || !Array.isArray(data.gates)) return null;
  const gates: CircuitGateView[] = [];
  for (const rawGate of data.gates) {
    const gate = object(rawGate);
    const gateInputs = gate ? strings(gate.inputs) : null;
    if (!gate || typeof gate.id !== "string" || typeof gate.operator !== "string" || !gateInputs) return null;
    gates.push({ id: gate.id, operator: gate.operator, inputs: gateInputs });
  }
  const rawOutputs = object(data.outputs);
  if (!rawOutputs) return null;
  const outputs = Object.entries(rawOutputs).map(([label, signal]) => ({ label, signal }));
  if (outputs.some((output) => typeof output.signal !== "string")) return null;
  return { inputs, gates, outputs: outputs as Array<{ label: string; signal: string }> };
}

function PrimitiveContent({ value }: { value: JsonValue }) {
  if (typeof value === "string" || typeof value === "number") return <>{value}</>;
  if (typeof value === "boolean") return <>{value ? "T" : "F"}</>;
  return <span className="text-on-surface-variant">Visual answer</span>;
}

export function CombinationalCircuitRenderer({ data }: { data: CircuitView }) {
  const width = 760;
  const rowHeight = 92;
  const height = Math.max(230, 78 + data.gates.length * rowHeight);
  const gateX = 320;
  const gateWidth = 132;
  const outputBySignal = new Map(data.outputs.map((output) => [output.signal, output.label]));
  return (
    <figure className="overflow-x-auto rounded-lg border border-workspace-border bg-surface-lowest p-3" data-circuit-diagram>
      <svg aria-label="Combinational circuit diagram" className="min-w-[620px] text-on-surface" role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="circuit-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path className="fill-current" d="M0,0 L8,4 L0,8 z" />
          </marker>
        </defs>
        <text className="fill-current text-xs font-semibold uppercase tracking-wider" x="28" y="30">Inputs</text>
        {data.inputs.map((input, index) => (
          <g key={input}>
            <circle className="fill-primary" cx="48" cy={62 + index * 34} r="5" />
            <text className="fill-current font-mono text-base font-bold" x="64" y={68 + index * 34}>{input}</text>
          </g>
        ))}
        {data.gates.map((gate, index) => {
          const y = 58 + index * rowHeight;
          const output = outputBySignal.get(gate.id);
          return (
            <g key={gate.id}>
              <text className="fill-current font-mono text-sm" textAnchor="end" x={gateX - 30} y={y + 29}>{gate.inputs.join(", ")}</text>
              <line className="stroke-on-surface-variant" markerEnd="url(#circuit-arrow)" strokeWidth="2" x1={gateX - 20} x2={gateX - 3} y1={y + 24} y2={y + 24} />
              <rect className="fill-surface-low stroke-primary" height="50" rx="12" strokeWidth="2" width={gateWidth} x={gateX} y={y} />
              <text className="fill-current text-sm font-bold" textAnchor="middle" x={gateX + gateWidth / 2} y={y + 22}>{gate.operator.toUpperCase()}</text>
              <text className="fill-on-surface-variant font-mono text-xs" textAnchor="middle" x={gateX + gateWidth / 2} y={y + 40}>{gate.id}</text>
              <line className="stroke-on-surface-variant" markerEnd="url(#circuit-arrow)" strokeWidth="2" x1={gateX + gateWidth} x2={gateX + gateWidth + 72} y1={y + 24} y2={y + 24} />
              <text className="fill-current font-mono text-sm font-semibold" x={gateX + gateWidth + 84} y={y + 29}>{gate.id}</text>
              {output ? <text className="fill-primary font-mono text-base font-bold" x={gateX + gateWidth + 170} y={y + 29}>{output} output</text> : null}
            </g>
          );
        })}
        {data.outputs.filter((output) => !outputBySignal.has(output.signal)).map((output, index) => (
          <text className="fill-primary font-mono text-sm font-bold" key={output.label} x="590" y={height - 40 + index * 20}>{output.label} = {output.signal}</text>
        ))}
      </svg>
      <figcaption className="sr-only">Signal flow from inputs {data.inputs.join(", ")} through {data.gates.length} gates to outputs {data.outputs.map((output) => output.label).join(", ")}.</figcaption>
    </figure>
  );
}

export function BooleanInputState({ table, label }: { table: TableView; label?: string }) {
  if (table.rows.length === 1 && table.headers.length <= 6) {
    return (
      <div aria-label={label ?? "Input state"} className="flex flex-wrap gap-2" data-boolean-input-state>
        {table.headers.map((header, index) => (
          <span className="rounded-md border border-workspace-border bg-surface-low px-3 py-2 font-mono text-sm" key={header}>
            <b>{header}</b> = {table.rows[0][index]}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-64 border-collapse text-center text-sm">
        <thead><tr>{table.headers.map((header) => <th className="border border-workspace-border bg-surface-low px-4 py-2" key={header}>{header}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => <td className="border border-workspace-border px-4 py-2 font-mono" key={columnIndex}>{value}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function SubjectContentBlocks({ blocks, label }: { blocks: PresentationBlock[]; label?: string }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.kind === "text") return <p className="whitespace-pre-line text-sm leading-7" key={index}>{block.text}</p>;
        if (block.kind === "code") return <pre className="overflow-x-auto rounded-md bg-code-background p-4 text-sm text-code-foreground" key={index}><code data-language={block.language}>{block.code}</code></pre>;
        if (block.kind === "formula") return <div className="rounded-md border border-workspace-border bg-surface-low px-4 py-3 text-center font-mono" key={index}>{block.expression}</div>;
        if (block.kind === "table") {
          const table = tableData(block.data);
          return table ? <BooleanInputState key={index} label={label} table={table} /> : null;
        }
        if (block.kind === "diagram") {
          const circuit = circuitData(block.data);
          if (circuit) return <CombinationalCircuitRenderer data={circuit} key={index} />;
          const diagram = genericDiagramData(block.data);
          return diagram ? <StructuredDiagramRenderer data={diagram} key={index} /> : <p className="rounded-md border border-warning bg-warning-container p-3 text-sm" key={index}>This structured diagram cannot be displayed.</p>;
        }
        return null;
      })}
    </div>
  );
}

export function ComputerScienceSubjectRenderer({ unit }: { unit: ComputerScienceSubjectUnit }) {
  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="self-start rounded-lg border border-workspace-border bg-surface-low p-5 lg:sticky lg:top-4" aria-labelledby={`${unit.stimulus.id}-title`}>
        <h2 className="text-lg font-semibold" id={`${unit.stimulus.id}-title`}>{unit.stimulus.title ?? "Subject stimulus"}</h2>
        <div className="mt-4"><SubjectContentBlocks blocks={unit.stimulus.blocks} /></div>
      </section>
      <ol className="space-y-6">
        {unit.questions.map((question, questionIndex) => (
          <li className="rounded-lg border border-workspace-border p-5" key={question.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Question {questionIndex + 1} of {unit.questions.length}</p>
            {question.blocks.length ? <div className="mt-3"><p className="mb-2 text-sm font-semibold">Input scenario S{questionIndex + 1}</p><SubjectContentBlocks blocks={question.blocks} label={`Input scenario S${questionIndex + 1}`} /></div> : null}
            <p className="mt-4 font-semibold">{question.prompt.replace(/^For input scenario S\d+,\s*/i, "")}</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2" aria-label={`Options for question ${questionIndex + 1}`}>
              {question.options.map((option) => <li className="rounded-md border border-workspace-border bg-surface-lowest px-4 py-3 text-sm" key={option.id}><span className="mr-2 font-semibold">{option.label}.</span><PrimitiveContent value={option.content} /></li>)}
            </ol>
          </li>
        ))}
      </ol>
    </article>
  );
}
