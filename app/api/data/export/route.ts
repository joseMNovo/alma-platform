import { NextResponse } from "next/server"
import { getAllData } from "@/lib/data-manager"

export async function GET() {
  try {
    const data = await getAllData()
    const jsonString = JSON.stringify(data, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="alma-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Error al exportar los datos" }, { status: 500 })
  }
}
