import postgres from 'postgres';

const connection = process.env.DATABASE_URL;
const sql = postgres(connection);

export default sql;