.PHONY: run seed test clean

run:
	go run ./cmd/api

seed:
	go run ./cmd/seed

test:
	go test ./... -v -count=1

test-short:
	go test ./... -short -count=1

clean:
	rm -f hobby-map.db
