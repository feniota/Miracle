. "./deploy-secrets.ps1"

pnpm install
pnpm build

scp $ScpAdditionalParams ./dist/* "${ServerAddress}:${ServerPath}"
ssh $SshAdditionalParams .\deploy-secrets.sample.ps1"${ServerAddress}" "chown -R ${ChownUser}:${ChownUser} $ServerPath"