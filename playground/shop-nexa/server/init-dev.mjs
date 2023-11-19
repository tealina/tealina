import { execSync } from 'child_process'

const $ = strs => {
  const command = strs.join(' ')
  execSync(command, { stdio: 'inherit', encoding: 'utf-8' })
}

$`pnpm install .`
$`pnpm prisma db push`
$`pnpm v1 gpure`
$`pnpm v1 capi get/health --with-test`
$`pnpm v1 gdoc`
