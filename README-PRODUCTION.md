# PersonalEA Production Setup

## Quick Start

```bash
# Start everything in production mode
./start-production.sh

# Check status
./server-manager.sh status

# View logs
./server-manager.sh logs

# Stop everything
./server-manager.sh stop
```

## Architecture

- **Frontend**: React + Vite (production build) on port 5174
- **Backend**: Node.js + Express on port 3000  
- **Health Monitor**: Automatic restart on failure
- **Process Management**: Custom scripts with logging

## Files

- `server-manager.sh` - Start/stop/restart servers
- `health-monitor.sh` - Automatic health monitoring
- `start-production.sh` - One-command startup
- `logs/` - All service logs
- `.env.production` - Environment configuration

## Health Monitoring

The health monitor checks:
- Backend API `/health` endpoint every 30 seconds
- Frontend port availability
- Auto-restarts after 3 consecutive failures
- Logs all activity to `logs/health-monitor.log`

## Production Features

- ✅ Automatic restart on failure
- ✅ Health monitoring and logging
- ✅ Production builds (optimized)
- ✅ Process management scripts
- ✅ Centralized logging
- ✅ Environment configuration
- ✅ Non-hanging command execution

## Reliability Improvements

1. **No More Hanging Commands**: All servers run with proper backgrounding
2. **Health Checks**: Automatic monitoring and restart
3. **Production Builds**: Optimized frontend serving
4. **Centralized Management**: Single command to control everything
5. **Logging**: All output captured for debugging
6. **Error Recovery**: Automatic restart on failures
