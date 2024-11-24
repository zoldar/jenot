defmodule Jenot.Repo.Migrations.AddDefaultAccount do
  use Ecto.Migration

  def change do
    id = Ecto.UUID.generate()
    now = DateTime.utc_now() |> DateTime.to_iso8601()

    execute """
      INSERT INTO accounts (id, inserted_at, updated_at)
      VALUES ('#{id}', '#{now}', '#{now}')
    """,
    """
      DELETE FROM accounts
    """
  end
end
