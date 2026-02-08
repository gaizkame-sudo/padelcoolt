const { shell } = require('electron');
const { loadConfig } = require('../config');

async function connectGmail() {
  await shell.openExternal('https://console.cloud.google.com/apis/credentials');
  return { status: 'info', message: 'Open Google Cloud Console to create OAuth credentials.' };
}

async function connectOutlook() {
  await shell.openExternal('https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
  return { status: 'info', message: 'Open Azure portal to register an application.' };
}

async function getEmailSummaries() {
  const config = loadConfig();

  const gmailConfigured = Boolean(config.gmailClientId && config.gmailClientSecret);
  const outlookConfigured = Boolean(config.outlookClientId && config.outlookTenantId);

  if (!gmailConfigured && !outlookConfigured) {
    return {
      status: 'not_configured',
      message: 'Email access is not configured yet. Add OAuth client IDs in Settings.',
      items: [],
    };
  }

  return {
    status: 'not_configured',
    message: 'OAuth flow not implemented yet. Add tokens in Settings once available.',
    items: [],
  };
}

module.exports = {
  connectGmail,
  connectOutlook,
  getEmailSummaries,
};
