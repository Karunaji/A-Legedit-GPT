const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');

async function promptForProjectType() {
  const typeResult = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Hero', 'Villain', 'Henchman', 'Mastermind', 'Scheme', 'Bystander', 'Cancel'],
    defaultId: 0,
    cancelId: 6,
    noLink: true,
    message: 'What kind of project do you want to create?',
    detail: 'Choose the kind of Legendary project you want to create.'
  });
  if (typeResult.response === 6) return { canceled: true };
  const projectType = ['hero', 'villain', 'henchman', 'mastermind', 'scheme', 'bystander'][typeResult.response] || 'hero';
  if (!['hero', 'villain', 'henchman', 'mastermind', 'scheme'].includes(projectType)) {
    return { canceled: false, unsupported: true, projectType };
  }
  return { canceled: false, unsupported: false, projectType };
}

async function promptForNewProject(projectTypeOption = null) {
  let projectType = projectTypeOption;
  if (!projectType) {
    const typeResult = await promptForProjectType();
    if (typeResult.canceled) return { mode: 'skip' };
    if (typeResult.unsupported) return { mode: 'unsupported', projectType: typeResult.projectType };
    projectType = typeResult.projectType;
  }
  if (!['hero', 'villain', 'henchman', 'mastermind', 'scheme'].includes(projectType)) {
    return { mode: 'unsupported', projectType };
  }
  const saveResult = await dialog.showSaveDialog({
    title: 'Create Legendary Project',
    defaultPath: `${projectType}-project.legendary.json`,
    filters: [{ name: 'Legendary Project', extensions: ['json'] }]
  });
  if (saveResult.canceled || !saveResult.filePath) return { mode: 'skip' };
  return { mode: 'new', filePath: saveResult.filePath, projectType };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 900,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('project:save', async (_event, options = {}) => {
  const { suggestedName = 'legendary-project.legendary.json', content = '', filePath = null } = options;
  let targetPath = filePath;
  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Legendary Project',
      defaultPath: suggestedName,
      filters: [{ name: 'Legendary Project', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    targetPath = result.filePath;
  }
  await fs.writeFile(targetPath, content, 'utf8');
  return { ok: true, canceled: false, filePath: targetPath };
});

ipcMain.handle('project:load', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Load Legendary Project',
    properties: ['openFile'],
    filters: [{ name: 'Legendary Project', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, 'utf8');
  return { canceled: false, filePath, content };
});

ipcMain.handle('project:share', async (_event, options = {}) => {
  const { suggestedName = 'legendary-project.legendary.json', content = '' } = options;
  const result = await dialog.showSaveDialog({
    title: 'Export Legendary Project',
    defaultPath: suggestedName,
    filters: [{ name: 'Legendary Project', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, content, 'utf8');
  await shell.showItemInFolder(result.filePath);
  return { canceled: false, revealed: true, filePath: result.filePath };
});

ipcMain.handle('export:chooseMode', async () => {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Current Card', 'Every Card', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    message: 'Export PNG',
    detail: 'Choose whether to export only the selected card or every card in the current card list.'
  });
  if (result.response === 2) return { canceled: true };
  return { canceled: false, mode: result.response === 1 ? 'all' : 'current' };
});

ipcMain.handle('export:chooseFolder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose Export Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  return { canceled: false, folderPath: result.filePaths[0] };
});

ipcMain.handle('export:savePng', async (_event, options = {}) => {
  const { folderPath, filename, dataUrl } = options;
  if (!folderPath || !filename || !dataUrl) return { ok: false, error: 'Missing export data' };
  const match = String(dataUrl).match(/^data:image\/png;base64,(.+)$/);
  if (!match) return { ok: false, error: 'Invalid PNG data' };
  const safeName = path.basename(filename);
  const targetPath = path.join(folderPath, safeName);
  await fs.writeFile(targetPath, Buffer.from(match[1], 'base64'));
  return { ok: true, filePath: targetPath };
});

ipcMain.handle('shell:openFolder', async (_event, options = {}) => {
  const folderPath = options.folderPath || null;
  if (!folderPath) return { ok: false, error: 'Missing folder path' };
  await shell.openPath(folderPath);
  return { ok: true };
});

ipcMain.handle('project:new', async (_event, options = {}) => {
  return promptForNewProject(options.projectType || null);
});

ipcMain.handle('project:openPath', async (_event, options = {}) => {
  const filePath = options.filePath || null;
  if (!filePath) return { canceled: true };
  try {
    await fs.access(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    return { canceled: false, filePath, content };
  } catch (err) {
    return { canceled: true, missing: true, error: err?.message || String(err) };
  }
});

ipcMain.handle('project:initSession', async (_event, options = {}) => {
  const lastPath = options.lastPath || null;
  let lastExists = false;
  if (lastPath) {
    try {
      await fs.access(lastPath);
      lastExists = true;
    } catch (_) {
      lastExists = false;
    }
  }

  const buttons = lastExists
    ? ['Reopen Last Project', 'Open Existing Project', 'Create New Project', 'Skip For Now']
    : ['Open Existing Project', 'Create New Project', 'Skip For Now'];

  const result = await dialog.showMessageBox({
    type: 'question',
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
    message: lastExists ? 'Choose a project to work on.' : 'Choose where this project should save.',
    detail: lastExists
      ? `Last project:\n${lastPath}`
      : 'You can open an existing project, choose a new save location, or skip for now.'
  });

  const choice = result.response;

  if (lastExists) {
    if (choice === 0) {
      const content = await fs.readFile(lastPath, 'utf8');
      return { mode: 'open', filePath: lastPath, content };
    }
    if (choice === 1) {
      const openResult = await dialog.showOpenDialog({
        title: 'Open Legendary Project',
        properties: ['openFile'],
        filters: [{ name: 'Legendary Project', extensions: ['json'] }]
      });
      if (openResult.canceled || !openResult.filePaths?.[0]) return { mode: 'skip' };
      const filePath = openResult.filePaths[0];
      const content = await fs.readFile(filePath, 'utf8');
      return { mode: 'open', filePath, content };
    }
    if (choice === 2) {
      return promptForNewProject();
    }
    return { mode: 'skip' };
  }

  if (choice === 0) {
    const openResult = await dialog.showOpenDialog({
      title: 'Open Legendary Project',
      properties: ['openFile'],
      filters: [{ name: 'Legendary Project', extensions: ['json'] }]
    });
    if (openResult.canceled || !openResult.filePaths?.[0]) return { mode: 'skip' };
    const filePath = openResult.filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    return { mode: 'open', filePath, content };
  }
  if (choice === 1) {
    return promptForNewProject();
  }
  return { mode: 'skip' };
});
