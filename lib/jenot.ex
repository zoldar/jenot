defmodule Jenot do
  @moduledoc """
  Note taking app. Spelled ye-not.
  """

  def host() do
    Application.fetch_env!(:jenot, :host)
  end
end
