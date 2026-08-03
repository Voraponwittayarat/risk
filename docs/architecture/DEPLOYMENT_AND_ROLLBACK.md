# Deployment and Rollback Strategy

## 1. Strangler Deployment (Blue/Green Routing)
The modernization requires side-by-side deployment of the legacy Yii2 application and the new Node.js/React stack.

### Web Server (Nginx/Apache) Configuration
- Reverse proxy rules will route specific new endpoints (e.g., `/api/v1/*` or `/analytics/*`) to the Node.js server.
- All default routes continue to fall back to the legacy Yii2 `index.php` entry script.

## 2. Database Migration Deployment
### Execution Protocol
1. **Pre-Deployment Backup**: Take a full mysqldump of the database before running any schema or engine alterations.
2. **Maintenance Window**: Scheduled during minimal activity (e.g., 2:00 AM - 4:00 AM).
3. **Dry Run**: Test the `ALTER TABLE ENGINE=InnoDB` migrations on a staging replica containing a dataset of equivalent size.

### Rollback Protocol
If application deadlocks or major data integrity errors are detected:
1. Immediately execute the downgrade script (`ALTER TABLE ENGINE=MyISAM`).
2. If data corruption occurred, restore the pre-deployment mysqldump.

## 3. Application Rollback
Because the new application components (Node/React) run adjacently to the legacy system, a rollback is as simple as reverting the Nginx reverse proxy configuration to send 100% of traffic back to the Yii2 application. No legacy application code is deleted until a module has run stably in production for 30 days.
