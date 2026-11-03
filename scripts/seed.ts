import { config } from 'dotenv';
import postgres from 'postgres';
import { demoSchedule } from '../src/lib/demo';
config({ path: '.env.local' });
config();
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is development-only');
if (!process.env.DATABASE_URL || !process.env.DEMO_USER_ID)
  throw new Error('Set DATABASE_URL and DEMO_USER_ID for a dedicated verified demo user');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.begin(async (tx) => {
    const [user] = await tx`select id from auth.users where id=${process.env.DEMO_USER_ID!}`;
    if (!user) throw new Error('Demo user not found');
    const [org] =
      await tx`insert into organizations(name) values('OpenSync development demo') returning id`;
    await tx`insert into memberships(organization_id,user_id) values(${org.id},${user.id})`;
    await tx`insert into locations(organization_id,draft) values(${org.id},${tx.json(demoSchedule)})`;
    console.log('Created a separate development demo organization. Publish it from the dashboard.');
  });
} finally {
  await sql.end();
}
