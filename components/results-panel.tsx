"use client"

import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ResultsPanelProps {
  results: any
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false)

  if (!results) {
    return (
      <motion.div
        className="h-full flex items-center justify-center text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Run a query to see results
      </motion.div>
    )
  }

  const { columns, rows, message } = results

  const copyToClipboard = () => {
    if (!rows || !columns) return

    const headers = columns.join("\t")
    const data = rows.map((row: any) => columns.map((col: string) => row[col]).join("\t")).join("\n")
    const text = `${headers}\n${data}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCsv = () => {
    if (!rows || !columns) return

    const headers = columns.join(",")
    const data = rows
      .map((row: any) =>
        columns
          .map((col: string) => {
            const value = row[col]
            // Escape quotes and wrap in quotes if contains comma
            return typeof value === "string" && (value.includes(",") || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          })
          .join(","),
      )
      .join("\n")

    const csv = `${headers}\n${data}`
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sqlite-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {message && (
        <motion.div
          className="mb-4 p-3 rounded-md bg-primary/10 text-primary"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message}
        </motion.div>
      )}

      {rows && columns && rows.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">
              Results: {rows.length} row{rows.length !== 1 ? "s" : ""}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={copyToClipboard}>
                {copied ? (
                  "Copied!"
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={downloadCsv}>
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column: string) => (
                    <TableHead key={column} className="font-medium">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any, i: number) => (
                  <TableRow key={i}>
                    {columns.map((column: string) => (
                      <TableCell key={column} className="font-mono">
                        {row[column] === null ? (
                          <span className="text-muted-foreground italic">NULL</span>
                        ) : typeof row[column] === "object" ? (
                          JSON.stringify(row[column])
                        ) : (
                          String(row[column])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : rows && rows.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Query executed successfully, but returned no data
        </div>
      ) : null}
    </motion.div>
  )
}
