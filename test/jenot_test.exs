defmodule JenotTest do
  use ExUnit.Case
  doctest Jenot

  test "greets the world" do
    assert Jenot.hello() == :world
  end
end
