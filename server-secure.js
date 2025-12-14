const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const BLOCKED_PATHS = [
    '/.git',
    '/.git/',
    '/.env',
    '/package.json',
    '/package-lock.json',
    '/node_modules',
    '/.htaccess',
    '/.gitignore',
    '/.gitconfig',
    '/.ssh',
    '/.config',
    '/server.js',
    '/server-secure.js'
];

const BLOCKED_EXTENSIONS = ['.log', '.md', '.json', '.yml', '.yaml', '.env'];

function isBlocked(pathname) {
    if (BLOCKED_PATHS.some(blocked => pathname.startsWith(blocked))) {
        return true;
    }
    
    const ext = path.extname(pathname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext) && !pathname.startsWith('/assets/')) {
        return true;
    }
    
    if (pathname.includes('.git')) {
        return true;
    }
    
    return false;
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
    };
    return types[ext] || 'application/octet-stream';
}

function setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    if (isBlocked(pathname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        console.log(`[BLOCKED] ${req.method} ${pathname} - ${req.headers['user-agent'] || 'Unknown'}`);
        return;
    }
    
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(PUBLIC_DIR, pathname);
    
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        
        setSecurityHeaders(res);
        
        const contentType = getContentType(filePath);
        res.setHeader('Content-Type', contentType);
        
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        
        stream.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        });
    });
});

server.listen(PORT, () => {
    console.log(`Secure server running on http://localhost:${PORT}`);
    console.log('Blocked paths: .git, .env, node_modules, and sensitive files');
});


