defmodule Jenot.Repo.Migrations.UpdateRemindersSchema do
  use Ecto.Migration

  def change do
    drop table(:reminders)

    create table(:reminders, primary_key: false) do
      add :date, :date, null: false
      add :time, :time, null: false
      add :repeat_period, :text, null: false
      add :repeat_count, :integer, null: false
      add :enabled, :boolean, null: false

      add :note_id, references(:note, on_delete: :delete_all), null: false, primary_key: true

      timestamps(type: :datetime_usec)
    end
  end
end
