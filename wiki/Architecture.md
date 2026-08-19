# Architecture

The finance application runs locally and owns local persistence. GitHub owns project history, documentation, project tracking, and releases. GitHub Pages hosts only the static product/demo website.

There is no hosted Margin API or hosted finance database in the initial product boundary.

Docker or Podman may be used for reproducible local development and CI after the runtime decision is made. Containers are not a hosted runtime for financial data.

The application should separate presentation, domain calculations, persistence, and export/backup so the core financial logic remains testable.
