# CSV upload

The Automation Import CSV tab uses `CsvDropzone` with no extra dependencies.

- Drop or browse one CSV to check extension, nonzero size and size limit, then request the existing authenticated `POST /api/imports/preview`.
- Review server-provided column mappings. Choose **Validate only** for `dry_run=true`, or **Upload CSV** for an actual import through `POST /api/imports/csv`.
- Both requests retain the existing multipart payload and authorization. Actual imports retain existing automatic scheduling semantics. File selection alone never imports or sends messages.
- Results show backend counts and row issues. Dry-run reminder counts are labelled proposed; nothing is saved. Successful imports refresh `GET /api/imports` history.
- Replacement/removal invalidates pending previews. Import controls are locked during submission. Loading is indeterminate because the existing fetch transport does not expose upload progress.

The client limit defaults to 5 MiB. Set optional `VITE_IMPORT_MAX_BYTES` in the root local environment and restart Vite (rebuild for deployment) to configure it; align it with backend `IMPORT_MAX_BYTES`. This value is public, not a secret. The component also accepts a `maxBytes` prop. The backend independently enforces file/content validation, authorization and row limits. CSV MIME types vary by operating system, so the client checks the filename extension rather than requiring a particular MIME type.

Tests: `cd frontend; npm run lint; npm test; npm run build`. Backend import integration tests: from `backend`, `.\.venv\Scripts\python.exe -m pytest tests/test_automation_api.py -k "import or dry_run or preview or file_validation or roles_are_enforced or endpoints_require" -q`. Tests use isolated data and scripted providers; UI requests use a fake API. No live customer test is needed.
