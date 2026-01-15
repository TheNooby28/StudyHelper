import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    family: 4
});

export default sql;