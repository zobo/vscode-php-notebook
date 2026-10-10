import * as net from 'net';

export async function getFreePort(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const server = net.createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close(() => reject(new Error('Failed to get server address')));
				return;
			}
			const port = address.port;
			server.close(() => resolve(port));
		});
	});
}

export function xdebugPhpArgs(port: number): string[] {
	return ['-dxdebug.mode=debug', '-dxdebug.start_with_request=1', `-dxdebug.client_port=${port}`];
}

export const xdebugEnv = { XDEBUG_MODE: 'debug' };
