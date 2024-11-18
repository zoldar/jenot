# Used by "mix format"
[
  import_deps: [:plug],
  subdirectories: ["priv/repo/migrations"],
  inputs: ["{mix,.formatter}.exs", "{config,lib,test}/**/*.{ex,exs}"]
]
