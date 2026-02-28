import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'alma_platform',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  // En producción, verificar que las variables de entorno de DB estén configuradas.
  // Se valida al momento de hacer queries (no al importar) para no romper el build.
  if (process.env.NODE_ENV === 'production') {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Variable de entorno requerida no encontrada: ${key}`)
      }
    }
  }
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

export default pool
