# Simple Skip Go Client Integration with Next.js

This is a simple example of the `@skip-go/client` in a a Next.js app. This is a good template or reference for a quick start integration.

## Getting Started

First, install the dependencies:

```bash
npm install
```

An API key is reccomended but not required to run this example. Learn more how to [request API keys](https://docs.skip.build/go/general/api-keys).

To add you API key populate the `.env` file with the following variables:

```bash
SKIP_API_KEY=your-api-key
```

Finally, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Proxying Skip API endpoint

To keep your API key secure and private, we recommend that you proxy the API requests from the frontend to your own backend—where you can add your API key in the header before forwarding the request to the Skip Go API.

A guide to do so can be found [here](https://docs.skip.build/go/general/api-keys#setup-a-proxy-to-receive-skip-go-api-requests-and-add-the-api-key).

## Learn More

To learn more about Skip, take a look at the following resources:

- [Skip Go Documentation](https://docs.skip.build/go/general/getting-started)
- [Request API keys](https://docs.skip.build/go/general/api-keys)
- [Skip Go Frontend](https://go.skip.build/)
- [Skip SDK](https://www.npmjs.com/package/@skip-go/client)
