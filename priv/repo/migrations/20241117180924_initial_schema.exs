defmodule Jenot.Repo.Migrations.InitialSchema do
  use Ecto.Migration

  def change do
    create table(:accounts, primary_key: false) do
      add :id, :uuid, primary_key: true

      timestamps(type: :datetime_usec)
    end

    create table(:notes, primary_key: false) do
      add :id, :uuid, null: false, primary_key: true
      add :internal_id, :text, null: false
      add :type, :text, null: false
      add :title, :text, null: false, default: ""
      add :content, :text, null: false, default: ""
      add :deleted_at, :datetime_usec

      add :account_id, references(:accounts, on_delete: :delete_all), null: false

      timestamps(type: :datetime_usec)
    end

    create index(:notes, [:account_id])
    create unique_index(:notes, [:account_id, :internal_id])

    create table(:subscriptions, primary_key: false) do
      add :id, :uuid, null: false, primary_key: true

      add :endpoint, :text, null: false
      add :token, :text, null: false
      add :auth, :text, null: false

      add :hash, :text, null: false

      add :account_id, references(:accounts, on_delete: :delete_all), null: false

      timestamps(type: :datetime_usec)
    end

    create index(:subscriptions, [:account_id])
    create unique_index(:subscriptions, [:hash])

    create table(:reminders, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :date, :date, null: false
      add :time, :time
      add :day_of_week, :integer
      add :repeat_period, :text
      add :repeat_count, :integer

      add :deleted_at, :datetime_usec

      add :note_id, references(:note, on_delete: :delete_all), null: false

      timestamps(type: :datetime_usec)
    end

    create index(:reminders, [:note_id])
  end
end
