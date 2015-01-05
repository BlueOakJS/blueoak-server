# Clustering

Clustering is supported out of the box.  The number of workers can be configured.  A value of 1 is recommended during development.

```json
{
  "cluster": {
    "maxWorkers": 1
  }
}
```

If *maxWorkers* is not specified or a negative value, the number of workers will be set to the number of cpus/cores on the system, which is recommended in production.