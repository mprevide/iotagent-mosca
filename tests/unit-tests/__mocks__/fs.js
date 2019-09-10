const fs = jest.genMockFromModule("fs");
let mockFiles = Object.create(null);

// example of newMockFiles
// { "./testFolder/file1.txt": "This is the file content"
function __createMockFiles(newMockFiles) {
    mockFiles = newMockFiles;
}

function readFile(pathToDirectory) {
    return mockFiles[pathToDirectory];
}

function exists(pathToDirectory) {
    return Boolean(mockFiles[pathToDirectory]);
}

fs.readFile = readFile;
fs.exists = exists;

fs.__createMockFiles = __createMockFiles;
module.exports = fs;
