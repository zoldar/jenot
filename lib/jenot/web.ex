defmodule Jenot.Web do
  @moduledoc """
  Web server
  """

  use Plug.Router

  if Mix.env() == :dev do
    plug PlugLiveReload
  end

  plug Plug.Logger

  plug :service_worker_header

  plug Plug.Static,
    at: "/",
    only: ~w(img js index.html site.webmanifest style.css),
    from: {:jenot, "priv/static"}

  plug :match
  plug :dispatch

  get "/" do
    priv_dir = :code.priv_dir(:jenot)
    index_path = Path.join([priv_dir, "static", "index.html"])

    send_file(conn, 200, index_path)

    conn
    |> resp(:found, "")
    |> put_resp_header("location", "/index.html")
  end

  get "/api" do
    send_resp(conn, 200, """
      Jenot API says hi!
    """)
  end

  match _ do
    send_resp(conn, 404, "not found")
  end

  defp service_worker_header(conn, _opts) do
    put_resp_header(conn, "service-worker-allowed", "/")
  end
end
