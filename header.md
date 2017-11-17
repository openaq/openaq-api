### Overview

Welcome to the OpenAQ API! This API is used to power various [tools built by the community](https://openaq.org/#/community) as well as [openaq.org](https://openaq.org).

If you have any problems, please create an issue on [GitHub](https://github.com/openaq/openaq-api/issues)!

### Rate Limiting

There are IP-based limits imposed of ~2000 requests over a 5 minute period. If you are running into a number of failed requests, please check the rate of requests.

### License

For the most up to date license information, please see [here](https://github.com/openaq/openaq-api/blob/develop/LICENSE.md).

### Data Retention to the API vs S3 Access

Currently the API only supports a rolling 90 day archive of the data. For access to the full dataset, you can access directly S3 by going [here](https://openaq-fetches.s3.amazonaws.com/index.html) or [here](https://openaq-data.s3.amazonaws.com/index.html).
