import { requireChatGPTUser } from './chatgpt-auth';
import TaskBoard from './task-board';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  return <TaskBoard displayName={user.fullName || user.email.split('@')[0]} signOutPath="/signout-with-chatgpt?return_to=%2F" />;
}
