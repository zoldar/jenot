defmodule Jenot.Repo.Migrations.UpdateRemindersSchema do
  use Ecto.Migration

  def up do
    drop_if_exists table(:reminders)

    create table(:reminders, primary_key: false) do
      add :date, :date, null: false
      add :time, :time, null: false
      add :repeat, :integer, null: true
      add :unit, :text, null: true
      add :enabled, :boolean, null: false

      add :note_id, references(:notes, on_delete: :delete_all, type: :binary_id), primary_key: true

      timestamps(type: :datetime_usec)
    end
  end

  def down do
    drop_if_exists table(:reminders)
  end
end
