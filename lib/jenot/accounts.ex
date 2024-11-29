defmodule Jenot.Accounts do
  alias Jenot.Account
  alias Jenot.Repo

  @cookie_name "jenot"
  @cookie_seconds 30 * 24 * 60 * 60

  def get_by_cookie(conn) do
    with {:ok, %{account_id: id}} <- get_cookie(conn) do
      get_by_id(id)
    end
  end

  def authenticate(name, code) do
    with {:ok, account} <- get_by_name(name),
         :ok <- validate_code(account, code) do
      {:ok, account}
    end
  end

  def new() do
    code = Account.generate_code()
    account = Account.new(code)

    case Repo.insert(account) do
      {:ok, account} -> {:ok, %{code: code, account: account}}
      {:error, _} -> {:error, :account_creation_failed}
    end
  end

  def set_cookie(conn, account_id) do
    conn
    |> Plug.Conn.put_resp_cookie(@cookie_name, %{account_id: account_id},
      domain: Jenot.host(),
      secure: secure_cookie(),
      encrypt: true,
      max_age: @cookie_seconds,
      same_site: "Strict"
    )
    |> Plug.Conn.put_resp_cookie("#{@cookie_name}_pub", "true",
      domain: Jenot.host(),
      http_only: false,
      max_age: @cookie_seconds,
      same_site: "Strict"
    )
  end

  def clear_cookie(conn) do
    Plug.Conn.delete_resp_cookie(conn, @cookie_name,
      domain: Jenot.host(),
      secure: secure_cookie(),
      encrypt: true,
      max_age: @cookie_seconds,
      same_site: "Strict"
    )
    |> Plug.Conn.delete_resp_cookie("#{@cookie_name}_pub",
      domain: Jenot.host(),
      http_only: false,
      max_age: @cookie_seconds,
      same_site: "Strict"
    )
  end

  defp get_by_name(name) do
    case Repo.get_by(Account, name: name) do
      nil ->
        # dummy calculation to prevent timing attacks
        Bcrypt.no_user_verify()
        {:error, :account_not_found}

      account ->
        {:ok, account}
    end
  end

  defp validate_code(account, code) do
    if Account.match?(account, code) do
      :ok
    else
      {:error, :account_not_found}
    end
  end

  defp get_cookie(conn) do
    conn
    |> Plug.Conn.fetch_cookies(encrypted: [@cookie_name])
    |> Map.fetch!(:cookies)
    |> Map.fetch(@cookie_name)
  end

  defp get_by_id(id) do
    case Repo.get(Account, id) do
      nil -> {:error, :account_not_found}
      account -> {:ok, account}
    end
  end

  def secure_cookie() do
    Application.fetch_env!(:jenot, :secure_cookie)
  end
end
