defmodule Jenot.Account do
  use Ecto.Schema

  import Ecto.Changeset

  @code_length 10

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "accounts" do
    field :name, :string
    field :code_digest, :string

    timestamps(type: :utc_datetime_usec)
  end

  def new(code) do
    id = Ecto.UUID.generate()

    %__MODULE__{}
    |> change()
    |> put_change(:id, id)
    |> put_change(:name, Hahash.name(id))
    |> put_change(:code_digest, hash(code))
  end

  def match?(account, input_code) do
    Bcrypt.verify_pass(input_code, account.code_digest)
  end

  @safe_disambiguations %{
    "O" => "8",
    "I" => "7"
  }

  def generate_code() do
    :crypto.strong_rand_bytes(6)
    |> Base.encode32(padding: false)
    |> String.replace(
      Map.keys(@safe_disambiguations),
      &Map.fetch!(@safe_disambiguations, &1)
    )
  end

  defp hash(code) when byte_size(code) == @code_length do
    Bcrypt.hash_pwd_salt(code)
  end
end
